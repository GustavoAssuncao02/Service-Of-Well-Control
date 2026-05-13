import { AsyncLocalStorage } from 'node:async_hooks';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool;
let db;
const transactionStorage = new AsyncLocalStorage();

function mysqlConnectionConfig(extraConfig = {}) {
  return {
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
    connectTimeout: 10000,
    ...extraConfig
  };
}

function normalizeParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }

  return params;
}

function normalizeSqlCommand(sql) {
  return sql.trim().replace(/;+\s*$/, '').replace(/\s+/g, ' ').toUpperCase();
}

function getTransactionStore() {
  const store = transactionStorage.getStore();
  return store?.active && store.connection ? store : null;
}

async function startTransaction(mysqlPool, sql) {
  if (getTransactionStore()) {
    throw new Error('Ja existe uma transacao ativa neste contexto.');
  }

  const connection = await mysqlPool.getConnection();
  const store = { connection, active: true };
  transactionStorage.enterWith(store);

  try {
    await connection.query(sql);
  } catch (error) {
    store.active = false;
    connection.release();
    throw error;
  }
}

async function finishTransaction(action) {
  const store = getTransactionStore();

  if (!store) {
    throw new Error(`Nenhuma transacao ativa para ${action === 'commit' ? 'COMMIT' : 'ROLLBACK'}.`);
  }

  try {
    if (action === 'commit') {
      await store.connection.commit();
    } else {
      await store.connection.rollback();
    }
  } finally {
    store.active = false;
    store.connection.release();
  }
}

function createClient(mysqlPool) {
  return {
    async exec(sql) {
      if (!sql?.trim()) return;

      const command = normalizeSqlCommand(sql);

      if (command === 'BEGIN' || command === 'START TRANSACTION') {
        await startTransaction(mysqlPool, sql);
        return;
      }

      if (command === 'COMMIT') {
        await finishTransaction('commit');
        return;
      }

      if (command === 'ROLLBACK') {
        await finishTransaction('rollback');
        return;
      }

      const executor = getTransactionStore()?.connection || mysqlPool;
      await executor.query(sql);
    },

    async all(sql, ...params) {
      const executor = getTransactionStore()?.connection || mysqlPool;
      const [rows] = await executor.execute(sql, normalizeParams(params));
      return rows;
    },

    async get(sql, ...params) {
      const rows = await this.all(sql, ...params);
      return rows[0];
    },

    async run(sql, ...params) {
      const executor = getTransactionStore()?.connection || mysqlPool;
      const [result] = await executor.execute(sql, normalizeParams(params));

      return {
        ...result,
        lastID: result.insertId,
        changes: result.affectedRows
      };
    }
  };
}

async function ensureDatabaseExists() {
  let serverConnection;

  try {
    serverConnection = await mysql.createConnection(mysqlConnectionConfig({
      multipleStatements: true
    }));
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `Acesso negado ao MySQL para ${env.dbUser}@${env.dbHost}. Configure DB_USER e DB_PASSWORD em backend/.env com as mesmas credenciais usadas no MySQL Workbench.`
      );
    }

    throw error;
  }

  try {
    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.dbName}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`
    );
  } catch (error) {
    if (['ER_DBACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) {
      let databaseConnection;

      try {
        databaseConnection = await mysql.createConnection({
          ...mysqlConnectionConfig(),
          database: env.dbName
        });
        return;
      } catch {
        throw new Error(
          `O usuario ${env.dbUser}@${env.dbHost} nao pode criar o banco ${env.dbName}, e tambem nao foi possivel conectar nele. Crie o banco no provedor MySQL ou ajuste DB_NAME.`
        );
      } finally {
        if (databaseConnection) {
          await databaseConnection.end();
        }
      }
    }

    throw error;
  } finally {
    await serverConnection.end();
  }
}

export async function getDb() {
  if (!db) {
    await ensureDatabaseExists();

    try {
      pool = mysql.createPool(mysqlConnectionConfig({
        database: env.dbName,
        charset: 'utf8mb4',
        multipleStatements: true,
        dateStrings: true,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      }));
    } catch (error) {
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error(
          `Acesso negado ao banco ${env.dbName}. Revise DB_USER e DB_PASSWORD em backend/.env.`
        );
      }

      throw error;
    }

    db = createClient(pool);
  }

  return db;
}

export function getDatabaseLabel() {
  return `${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName}`;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
  }

  pool = undefined;
  db = undefined;
}
