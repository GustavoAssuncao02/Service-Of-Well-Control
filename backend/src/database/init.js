import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { getDb } from './db.js';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getColumn(db, tableName, columnName) {
  return db.get(
    `SELECT COLUMN_NAME, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    env.dbName,
    tableName,
    columnName
  );
}

async function ensureColumn(db, tableName, columnName, definition) {
  const column = await getColumn(db, tableName, columnName);

  if (!column) {
    await db.run(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definition}`);
  }
}

async function ensureIndex(db, tableName, indexName, definition) {
  const index = await db.get(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    env.dbName,
    tableName,
    indexName
  );

  if (!index) {
    await db.run(`ALTER TABLE \`${tableName}\` ADD INDEX ${indexName} (${definition})`);
  }
}

async function ensureForeignKey(db, constraintName, tableName, definition) {
  const constraint = await db.get(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ?
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    env.dbName,
    tableName,
    constraintName
  );

  if (!constraint) {
    await db.run(`ALTER TABLE \`${tableName}\` ADD CONSTRAINT ${constraintName} ${definition}`);
  }
}

function isRetryableLockError(error) {
  return ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error?.code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWithLockRetry(operation, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableLockError(error) || attempt === attempts) {
        throw error;
      }

      await sleep(120 * attempt);
    }
  }
}

async function dropForeignKeyIfExists(db, constraintName, tableName) {
  const constraint = await db.get(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = ?
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    env.dbName,
    tableName,
    constraintName
  );

  if (constraint) {
    await db.run(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY ${constraintName}`);
  }
}

async function removeStudentUserLink(db) {
  const studentUserColumn = await getColumn(db, 'alunos', 'usuario_id');

  if (!studentUserColumn) {
    return;
  }

  await dropForeignKeyIfExists(db, 'fk_alunos_usuario', 'alunos');
  await db.run('ALTER TABLE alunos DROP COLUMN usuario_id');
}

async function ensureCourseClassificationSupport(db) {
  await db.run(
    `INSERT IGNORE INTO classificacoes_cursos (nome, descricao)
     VALUES ('Geral', 'Classificacao padrao para cursos existentes.')`
  );

  const defaultClassification = await db.get("SELECT id FROM classificacoes_cursos WHERE nome = 'Geral'");

  await ensureColumn(db, 'cursos', 'classificacao_id', 'classificacao_id INT NULL');
  await db.run('UPDATE cursos SET classificacao_id = ? WHERE classificacao_id IS NULL', defaultClassification.id);

  const classificationColumn = await getColumn(db, 'cursos', 'classificacao_id');
  if (classificationColumn?.IS_NULLABLE === 'YES') {
    await db.run('ALTER TABLE cursos MODIFY classificacao_id INT NOT NULL');
  }

  await ensureIndex(db, 'cursos', 'idx_cursos_classificacao_id', 'classificacao_id');
  await ensureForeignKey(
    db,
    'fk_cursos_classificacao',
    'cursos',
    'FOREIGN KEY (classificacao_id) REFERENCES classificacoes_cursos(id) ON DELETE RESTRICT'
  );
}

async function ensureOnlineRoomSupport(db) {
  await ensureColumn(db, 'turmas', 'sala_online', 'sala_online VARCHAR(191)');

  const legacyOnlineRooms = await db.all(
    `SELECT DISTINCT TRIM(sala_online) AS nome
     FROM turmas
     WHERE sala_online IS NOT NULL AND TRIM(sala_online) <> ''`
  );

  for (const room of legacyOnlineRooms) {
    await runWithLockRetry(() => db.run('INSERT IGNORE INTO salas_online (nome) VALUES (?)', room.nome));
  }
}

async function ensureLocationSupport(db) {
  const legacyLocations = await db.all(
    `SELECT DISTINCT COALESCE(l.nome, TRIM(t.local)) AS nome
     FROM turmas t
     LEFT JOIN locais l
       ON TRIM(t.local) REGEXP '^[0-9]+$'
      AND l.id = CAST(TRIM(t.local) AS UNSIGNED)
     WHERE t.local IS NOT NULL AND TRIM(t.local) <> ''`
  );

  for (const location of legacyLocations) {
    await runWithLockRetry(() => db.run('INSERT IGNORE INTO locais (nome) VALUES (?)', location.nome));
  }

  const numericClassLocations = await db.all(
    `SELECT t.id AS turma_id, l.nome
     FROM turmas t
     JOIN locais l
       ON TRIM(t.local) REGEXP '^[0-9]+$'
      AND l.id = CAST(TRIM(t.local) AS UNSIGNED)
     WHERE t.local <> l.nome`
  );

  for (const classLocation of numericClassLocations) {
    await runWithLockRetry(() =>
      db.run(
        `UPDATE turmas
         SET local = ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ?`,
        classLocation.nome,
        classLocation.turma_id
      )
    );
  }

  await runWithLockRetry(() =>
    db.run(
      `DELETE l_bad
       FROM locais l_bad
       JOIN locais l_good
         ON l_bad.nome REGEXP '^[0-9]+$'
        AND l_good.id = CAST(l_bad.nome AS UNSIGNED)
        AND l_bad.id <> l_good.id
       LEFT JOIN turmas t ON t.local = l_bad.nome
       WHERE t.id IS NULL`
    )
  );
}

async function ensureCompanySupport(db) {
  await ensureColumn(db, 'alunos', 'empresa_id', 'empresa_id INT NULL');

  const legacyCompanies = await db.all(
    `SELECT DISTINCT TRIM(empresa) AS nome
     FROM alunos
     WHERE empresa IS NOT NULL AND TRIM(empresa) <> ''`
  );

  for (const company of legacyCompanies) {
    await runWithLockRetry(() => db.run('INSERT IGNORE INTO empresas (nome) VALUES (?)', company.nome));
  }

  const legacyStudentCompanies = await db.all(
    `SELECT a.id AS aluno_id, e.id AS empresa_id
     FROM alunos a
     JOIN empresas e ON e.nome = TRIM(a.empresa)
     WHERE a.empresa_id IS NULL
       AND a.empresa IS NOT NULL
       AND TRIM(a.empresa) <> ''`
  );

  for (const studentCompany of legacyStudentCompanies) {
    await runWithLockRetry(() =>
      db.run(
        `UPDATE alunos
         SET empresa_id = ?, atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ? AND empresa_id IS NULL`,
        studentCompany.empresa_id,
        studentCompany.aluno_id
      )
    );
  }

  await ensureIndex(db, 'alunos', 'idx_alunos_empresa_id', 'empresa_id');
  await ensureForeignKey(
    db,
    'fk_alunos_empresa',
    'alunos',
    'FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL'
  );
}

async function ensureBirthdayMessageSupport(db) {
  await db.run(
    `INSERT IGNORE INTO mensagens_aniversario (titulo, conteudo)
     VALUES (
       'Mensagem padrão de aniversário',
       'Olá, {primeiro_nome}! Feliz aniversário! A SWC deseja um ótimo dia para você. Como presente de aniversário, você ganhou 15% de desconto válido por 30 dias. Venha fazer um curso com a gente com essa oferta!'
     )`
  );
}

async function ensureStudentDocumentDriveSupport(db) {
  await ensureColumn(db, 'aluno_documentos', 'turma_id', 'turma_id INT NULL AFTER aluno_id');
  await ensureColumn(db, 'aluno_documentos', 'drive_file_id', 'drive_file_id VARCHAR(191)');
  await ensureColumn(db, 'aluno_documentos', 'drive_folder_id', 'drive_folder_id VARCHAR(191)');
  await ensureColumn(db, 'aluno_documentos', 'drive_url', 'drive_url TEXT');
  await ensureIndex(db, 'aluno_documentos', 'idx_aluno_documentos_turma_id', 'turma_id');
  await ensureIndex(db, 'aluno_documentos', 'idx_aluno_documentos_drive_file_id', 'drive_file_id');
  await ensureForeignKey(
    db,
    'fk_aluno_documentos_turma',
    'aluno_documentos',
    'FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE SET NULL'
  );
}

async function ensureStudentNotesSupport(db) {
  await ensureColumn(db, 'alunos', 'observacao', 'observacao TEXT');
}

export async function initializeDatabase() {
  const db = await getDb();
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  const lockName = `${env.dbName}:initializeDatabase`;
  const lock = await db.get('SELECT GET_LOCK(?, 30) AS acquired', lockName);

  if (Number(lock?.acquired) !== 1) {
    throw new Error('Nao foi possivel obter o lock de inicializacao do banco. Tente iniciar o backend novamente.');
  }

  try {
    await db.exec(schema);
    await db.run("ALTER TABLE usuarios MODIFY role ENUM('aluno', 'admin', 'pendente') NOT NULL DEFAULT 'pendente'");
    await removeStudentUserLink(db);
    await ensureCompanySupport(db);
    await ensureBirthdayMessageSupport(db);
    await ensureCourseClassificationSupport(db);
    await ensureOnlineRoomSupport(db);
    await ensureLocationSupport(db);
    await ensureStudentNotesSupport(db);
    await ensureStudentDocumentDriveSupport(db);

    const existingAdmin = await db.get('SELECT id FROM usuarios WHERE email = ?', env.adminEmail);
    if (!existingAdmin) {
      const hash = await bcrypt.hash(env.adminPassword, 10);
      await db.run(
        `INSERT INTO usuarios (nome, email, senha_hash, role)
         VALUES (?, ?, ?, 'admin')`,
        env.adminName,
        env.adminEmail,
        hash
      );
    }

    return db;
  } finally {
    await db.get('SELECT RELEASE_LOCK(?) AS released', lockName);
  }
}
