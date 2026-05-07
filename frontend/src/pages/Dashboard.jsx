import { Activity, BookOpenCheck, CheckCircle2, GraduationCap, Monitor, TrendingUp, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getApiError } from '../api/client.js';
import { EmptyState } from '../components/Field.jsx';
import { formatDate } from '../utils/date.js';
import { isDoneStatus } from '../utils/display.js';

const sponsorColors = ['#3b82f6', '#f97316', '#16a34a', '#7c3aed'];
const modalityColors = ['#f97316', '#3b82f6', '#16a34a', '#7c3aed', '#0f766e'];

function StatCard({ icon: Icon, label, value, tone, hint }) {
  return (
    <article className={`stat-card ${tone || ''}`}>
      <span>
        <Icon size={22} />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        {hint ? <small>{hint}</small> : null}
      </div>
    </article>
  );
}

function variationLabel(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toFixed(1)}% vs mes anterior`;
}

function handleRowKeyDown(event, action) {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function formatPercent(value) {
  const percentage = Number(value || 0);
  return `${percentage >= 10 ? percentage.toFixed(0) : percentage.toFixed(1)}%`;
}

function piePercentLabel({ percent }) {
  const percentage = Number(percent || 0) * 100;
  return percentage ? formatPercent(percentage) : '';
}

function StudentCountTooltip({ active, payload, total, nameKey }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const row = item.payload || {};
  const value = Number(item.value || 0);
  const percentage = total ? (value * 100) / total : 0;
  const name = row[nameKey] || item.name || 'Categoria';

  return (
    <div className="chart-tooltip">
      <strong>{name}</strong>
      <span>{formatPercent(percentage)}</span>
      <small>{value} {value === 1 ? 'aluno' : 'alunos'}</small>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then((response) => setData(response.data))
      .catch((err) => setError(getApiError(err)));
  }, []);

  if (error) {
    return <div className="alert error">{error}</div>;
  }

  if (!data) {
    return <div className="loading">Carregando dashboard...</div>;
  }

  const courseFrequency = data.courseFrequency?.length ? data.courseFrequency : data.courseDistribution;
  const topCourse = courseFrequency?.find((item) => Number(item.total || 0) > 0);
  const sponsorDistribution = data.sponsorDistribution || [];
  const sponsorTotal = sponsorDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
  const classModalityDistribution = data.classModalityDistribution || data.attendanceDistribution || [];
  const modalityTotal = classModalityDistribution.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;
  const onlineTotal = classModalityDistribution.find((item) => item.modalidade === 'Online')?.total || 0;
  const presencialTotal = classModalityDistribution.find((item) => item.modalidade === 'Presencial')?.total || 0;

  return (
    <div className="page-stack">
      <div className="section-heading">
        <span>Visão principal</span>
        <h1>Dashboard</h1>
        <p>Acompanhe turmas ativas, conclusão e evolução da base de alunos.</p>
      </div>

      <section className="stats-grid">
        <StatCard icon={BookOpenCheck} label="Turmas ativas" value={data.activeCourses} tone="blue" />
        <StatCard icon={CheckCircle2} label="Turmas concluídas" value={data.completedCourses} tone="green" />
        <StatCard icon={UsersRound} label="Alunos cadastrados" value={data.totalStudents} tone="orange" />
        <StatCard icon={GraduationCap} label="Turmas registradas" value={data.totalClasses} tone="slate" />
        <StatCard icon={UserPlus} label="Alunos este mes" value={data.currentMonthStudents} tone="blue" />
        <StatCard icon={TrendingUp} label="Alunos no ultimo mes" value={data.lastMonthStudents} tone="green" hint={variationLabel(data.lastMonthStudentVariation)} />
        <StatCard icon={Activity} label="Media de alunos por mes" value={data.averageStudentsPerMonth} tone="orange" />
        <StatCard icon={BookOpenCheck} label="Curso mais realizado" value={topCourse?.total || 0} tone="slate" hint={topCourse?.nome || 'Sem turmas'} />
        <StatCard icon={UsersRound} label="Alunos presenciais" value={presencialTotal} tone="orange" hint={`${modalityTotal || 0} classificados`} />
        <StatCard icon={Monitor} label="Alunos online" value={onlineTotal} tone="blue" hint={`${modalityTotal || 0} classificados`} />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Distribuição de cursos</h2>
          </div>
          {data.courseDistribution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.courseDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2f80c3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem cursos ainda" description="Cadastre cursos e turmas para preencher o gráfico." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Evolução de alunos</h2>
          </div>
          {data.studentEvolution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.studentEvolution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="periodo" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#ff7a1a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem histórico" description="A evolução aparece conforme alunos são cadastrados." />
          )}
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Cursos mais realizados</h2>
          </div>
          {courseFrequency?.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseFrequency}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem turmas" description="Cadastre turmas para visualizar os cursos mais realizados." />
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <h2>Empresa x Particular</h2>
          </div>
          {sponsorDistribution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sponsorDistribution} dataKey="total" nameKey="tipo" innerRadius={64} outerRadius={108} paddingAngle={4} label={piePercentLabel}>
                    {sponsorDistribution.map((item, index) => (
                      <Cell key={item.tipo} fill={sponsorColors[index % sponsorColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<StudentCountTooltip total={sponsorTotal} nameKey="tipo" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem distribuicao" description="Vincule alunos a turmas para comparar Empresa e Particular." />
          )}
        </article>
      </section>

      <section className="dashboard-grid single-panel-grid">
        <article className="panel">
          <div className="panel-heading">
            <h2>Modalidades dos alunos</h2>
          </div>
          {classModalityDistribution.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={classModalityDistribution} dataKey="total" nameKey="modalidade" innerRadius={64} outerRadius={108} paddingAngle={4} label={piePercentLabel}>
                    {classModalityDistribution.map((item, index) => (
                      <Cell key={item.modalidade} fill={modalityColors[index % modalityColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<StudentCountTooltip total={modalityTotal} nameKey="modalidade" />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="Sem modalidades" description="Vincule alunos a turmas para comparar as modalidades." />
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Turmas recentes</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Curso</th>
                <th>Instrutor</th>
                <th>Período</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingClasses.map((item) => (
                <tr
                  key={item.id}
                  className="clickable-row"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/turmas/${item.id}`)}
                  onKeyDown={(event) => handleRowKeyDown(event, () => navigate(`/admin/turmas/${item.id}`))}
                >
                  <td>{item.curso_nome}</td>
                  <td>{item.instrutor_nome}</td>
                  <td>
                    {formatDate(item.data_inicio)} a {formatDate(item.data_fim)}
                  </td>
                  <td>
                    <span className={`status-badge ${isDoneStatus(item.status) ? 'done' : 'active'}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
