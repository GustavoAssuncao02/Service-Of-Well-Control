import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { initializeDatabase } from './database/init.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.routes.js';
import { userRoutes } from './routes/users.routes.js';
import { studentRoutes } from './routes/students.routes.js';
import { companyRoutes } from './routes/companies.routes.js';
import { instructorRoutes } from './routes/instructors.routes.js';
import { locationRoutes } from './routes/locations.routes.js';
import { onlineRoomRoutes } from './routes/onlineRooms.routes.js';
import { classModalityRoutes } from './routes/classModalities.routes.js';
import { courseRoutes } from './routes/courses.routes.js';
import { courseClassificationRoutes } from './routes/courseClassifications.routes.js';
import { classRoutes } from './routes/classes.routes.js';
import { publicRoutes } from './routes/public.routes.js';
import { evaluationRoutes } from './routes/evaluations.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { calendarRoutes } from './routes/calendar.routes.js';
import { historyRoutes } from './routes/history.routes.js';
import { userAreaRoutes } from './routes/userArea.routes.js';
import { driveRoutes } from './routes/drive.routes.js';
import { testRoutes } from './routes/test.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const databaseStatus = {
  ok: false,
  initializing: true,
  message: 'Inicializando banco de dados.',
  checkedAt: null
};

console.log('Iniciando Service Of WellControl API...');
console.log(`Servidor configurado para ${env.host}:${env.port} (origem da porta: ${env.portSource})`);
console.log(`JELASTIC_EXPOSE=${process.env.JELASTIC_EXPOSE || '(nao definido)'}`);
console.log(`PORT=${process.env.PORT || '(nao definido)'}`);
console.log(`Inicializando banco: ${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName}`);

const databaseReady = initializeDatabase()
  .then(() => {
    databaseStatus.ok = true;
    databaseStatus.initializing = false;
    databaseStatus.message = 'Banco inicializado com sucesso.';
    databaseStatus.checkedAt = new Date().toISOString();
    console.log(databaseStatus.message);
  })
  .catch((error) => {
    databaseStatus.ok = false;
    databaseStatus.initializing = false;
    databaseStatus.message = error.message || 'Falha ao inicializar o banco de dados.';
    databaseStatus.checkedAt = new Date().toISOString();

    console.error('Falha ao inicializar o banco de dados.');
    console.error(`Conexao configurada: ${env.dbUser}@${env.dbHost}:${env.dbPort}/${env.dbName}`);
    console.error(
      'Na hospedagem, configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET e ADMIN_PASSWORD nas Environment Variables.'
    );
    console.error(error);
  });

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Service Of WellControl API',
    server: {
      host: env.host,
      port: env.port,
      portSource: env.portSource,
      jelasticExpose: process.env.JELASTIC_EXPOSE || null
    },
    database: databaseStatus
  });
});

app.get('/api/health/drive', (req, res) => {
  res.json({
    ok: true,
    enabled: env.googleDriveEnabled,
    authType: env.googleDriveAuthType,
    configured: env.googleDriveAuthType === 'oauth'
      ? Boolean(env.googleDriveOauthRefreshToken && (env.googleDriveOauthClientJson || env.googleDriveOauthClientFile))
      : Boolean(env.googleDriveCredentialsJson || env.googleDriveCredentialsFile),
    hasServiceAccountCredentials: Boolean(env.googleDriveCredentialsJson || env.googleDriveCredentialsFile),
    hasOauthClient: Boolean(env.googleDriveOauthClientJson || env.googleDriveOauthClientFile),
    hasOauthRefreshToken: Boolean(env.googleDriveOauthRefreshToken),
    hasParentFolderId: Boolean(env.googleDriveParentFolderId),
    hasStudentsFolderId: Boolean(env.googleDriveStudentsFolderId),
    studentsFolderName: env.googleDriveStudentsFolderName,
    userAreaFolderName: env.googleDriveUserAreaFolderName,
    maxUploadMb: env.googleDriveMaxUploadMb,
    uploadConcurrency: env.googleDriveUploadConcurrency
  });
});

app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next();
  }

  if (databaseStatus.initializing) {
    await databaseReady.catch(() => null);
  }

  if (!databaseStatus.ok) {
    return res.status(503).json({
      message: 'Banco de dados indisponivel.',
      database: databaseStatus
    });
  }

  return next();
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/online-rooms', onlineRoomRoutes);
app.use('/api/class-modalities', classModalityRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/course-classifications', courseClassificationRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/user-area', userAreaRoutes);
app.use('/api/drive', driveRoutes);
app.use('/api/test', testRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

const hasFrontendBuild = fs.existsSync(frontendIndexPath);
console.log(`Frontend build: ${hasFrontendBuild ? frontendIndexPath : 'nao encontrado'}`);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ message: 'Rota não encontrada.' });
  });
}

app.use(errorHandler);

const listenTargets = new Map();

listenTargets.set(env.port, {
  label: `porta principal (${env.portSource})`,
  required: true
});

if (env.port !== 8080) {
  listenTargets.set(8080, {
    label: 'fallback Jelastic',
    required: false
  });
}

for (const [port, target] of listenTargets) {
  const server = app.listen(port, env.host, () => {
    console.log(`API rodando em http://${env.host}:${port}/api (${target.label})`);
  });

  server.on('error', (error) => {
    console.error(`Falha ao iniciar servidor em ${env.host}:${port} (${target.label}).`);
    console.error(error);

    if (target.required) {
      process.exit(1);
    }
  });
}
