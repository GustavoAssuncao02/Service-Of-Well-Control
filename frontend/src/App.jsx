import { Navigate, Route, Routes } from 'react-router-dom';
import AccessRequests from './pages/AccessRequests.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Birthdays from './pages/Birthdays.jsx';
import Calendar from './pages/Calendar.jsx';
import ClassDetails from './pages/ClassDetails.jsx';
import ClassModalities from './pages/ClassModalities.jsx';
import ClassReport from './pages/ClassReport.jsx';
import Companies from './pages/Companies.jsx';
import CoursesClasses from './pages/CoursesClasses.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DocumentBrowser from './pages/DocumentBrowser.jsx';
import EvaluationControl from './pages/EvaluationControl.jsx';
import EvaluationPublic from './pages/EvaluationPublic.jsx';
import EvaluationReport from './pages/EvaluationReport.jsx';
import EvaluationReaction from './pages/EvaluationReaction.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import Instructors from './pages/Instructors.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import RequestAccess from './pages/RequestAccess.jsx';
import StudentHome from './pages/StudentHome.jsx';
import StudentDetails from './pages/StudentDetails.jsx';
import StudentReport from './pages/StudentReport.jsx';
import Students from './pages/Students.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  return (
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
  );
}
