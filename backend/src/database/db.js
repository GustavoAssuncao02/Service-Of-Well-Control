import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let connection;
let db;

function normalizeParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }

  return params;
}

function createClient(mysqlConnection) {
  return {
    async exec(sql) {
      if (!sql?.trim()) return;
      await mysqlConnection.query(sql);
    },

    async all(sql, ...params) {
      const [rows] = await mysqlConnection.execute(sql, normalizeParams(params));
      return rows;
    },

    async get(sql, ...params) {
      const rows = await this.all(sql, ...params);
      return rows[0];
    },

    async run(sql, ...params) {
      const [result] = await mysqlConnection.execute(sql, normalizeParams(params));

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
    serverConnection = await mysql.createConnection({
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      multipleStatements: true
    });
  } catch (error) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `Acesso negado ao MySQL para ${env.dbUser}@${env.dbHost}. Configure DB_USER e DB_PASSWORD em backend/.env com as mesmas credenciais usadas no MySQL Workbench.`
      );
    }

    throw error;
  }

  await serverConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.dbName}\`
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci`
  );
  await serverConnection.end();
}

export async function getDb() {
  if (!db) {
    await ensureDatabaseExists();

    try {
      connection = await mysql.createConnection({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        charset: 'utf8mb4',
        multipleStatements: true,
        dateStrings: true
      });
    } catch (error) {
      if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        throw new Error(
          `Acesso negado ao banco ${env.dbName}. Revise DB_USER e DB_PASSWORD em backend/.env.`
        );
      }

      throw error;
    }

    db = createClient(connection);
  }

  return db;
}

export function getDatabaseLabel() {
  return `${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName}`;
}

export async function closeDb() {
  if (connection) {
    await connection.end();
  }

  connection = undefined;
  db = undefined;
}
