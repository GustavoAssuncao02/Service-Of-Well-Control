import express from 'express';
import cors from 'cors';
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
import { courseRoutes } from './routes/courses.routes.js';
import { courseClassificationRoutes } from './routes/courseClassifications.routes.js';
import { classRoutes } from './routes/classes.routes.js';
import { publicRoutes } from './routes/public.routes.js';
import { evaluationRoutes } from './routes/evaluations.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { calendarRoutes } from './routes/calendar.routes.js';
import { historyRoutes } from './routes/history.routes.js';

await initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Service Of WellControl API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/instructors', instructorRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/online-rooms', onlineRoomRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/course-classifications', courseClassificationRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/history', historyRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`API rodando em http://localhost:${env.port}/api`);
});
