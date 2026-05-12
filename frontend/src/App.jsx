import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const AccessRequests = lazy(() => import('./pages/AccessRequests.jsx'));
const Birthdays = lazy(() => import('./pages/Birthdays.jsx'));
const Calendar = lazy(() => import('./pages/Calendar.jsx'));
const ClassDetails = lazy(() => import('./pages/ClassDetails.jsx'));
const ClassModalities = lazy(() => import('./pages/ClassModalities.jsx'));
const ClassReport = lazy(() => import('./pages/ClassReport.jsx'));
const Companies = lazy(() => import('./pages/Companies.jsx'));
const CoursesClasses = lazy(() => import('./pages/CoursesClasses.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const DocumentBrowser = lazy(() => import('./pages/DocumentBrowser.jsx'));
const EvaluationControl = lazy(() => import('./pages/EvaluationControl.jsx'));
const EvaluationPublic = lazy(() => import('./pages/EvaluationPublic.jsx'));
const EvaluationReport = lazy(() => import('./pages/EvaluationReport.jsx'));
const EvaluationReaction = lazy(() => import('./pages/EvaluationReaction.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const Instructors = lazy(() => import('./pages/Instructors.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const RequestAccess = lazy(() => import('./pages/RequestAccess.jsx'));
const StudentDetails = lazy(() => import('./pages/StudentDetails.jsx'));
const StudentHome = lazy(() => import('./pages/StudentHome.jsx'));
const StudentReport = lazy(() => import('./pages/StudentReport.jsx'));
const Students = lazy(() => import('./pages/Students.jsx'));
const UserArea = lazy(() => import('./pages/UserArea.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="loading">Carregando modulo...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/cadastro" replace />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitar-acesso" element={<RequestAccess />} />
        <Route path="/avaliacao" element={<EvaluationPublic />} />
        <Route path="/avaliacao/:turmaId" element={<EvaluationPublic />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/aluno" element={<StudentHome />} />
        </Route>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Calendar />} />
            <Route path="area-usuario" element={<UserArea />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="perfil" element={<Profile />} />
            <Route path="empresas" element={<Companies />} />
            <Route path="alunos" element={<Students />} />
            <Route path="alunos/:id" element={<StudentDetails />} />
            <Route path="documentos" element={<DocumentBrowser />} />
            <Route path="instrutores" element={<Instructors />} />
            <Route path="cursos-turmas" element={<CoursesClasses />} />
            <Route path="modalidades-aula" element={<ClassModalities />} />
            <Route path="turmas/:id" element={<ClassDetails />} />
            <Route path="avaliacoes" element={<Navigate to="/admin/relatorio-avaliacoes" replace />} />
            <Route path="avaliacoes/:id" element={<EvaluationReaction />} />
            <Route path="controle-avaliacoes" element={<EvaluationControl />} />
            <Route path="calendario" element={<Calendar />} />
            <Route path="aniversariantes" element={<Birthdays />} />
            <Route path="historico" element={<HistoryPage />} />
            <Route path="usuarios" element={<UsersPage />} />
            <Route path="solicitacoes" element={<AccessRequests />} />
            <Route path="relatorio-avaliacoes" element={<EvaluationReport />} />
            <Route path="relatorio-turmas" element={<ClassReport />} />
            <Route path="relatorio-alunos" element={<StudentReport />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
