CREATE DATABASE IF NOT EXISTS service_of_wellcontrol
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE service_of_wellcontrol;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  role ENUM('aluno', 'admin', 'pendente') NOT NULL DEFAULT 'pendente',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS empresas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_empresas_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mensagens_aniversario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(191) NOT NULL,
  conteudo TEXT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mensagens_aniversario_titulo (titulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(191) NOT NULL,
  data_nascimento DATE NOT NULL,
  telefone VARCHAR(40) NOT NULL,
  cpf VARCHAR(20) NOT NULL,
  email VARCHAR(191) NOT NULL,
  sexo ENUM('Masculino', 'Feminino', 'Prefiro não dizer', 'Outro') NOT NULL,
  sexo_outro VARCHAR(120),
  cep VARCHAR(20) NOT NULL,
  rua VARCHAR(191) NOT NULL,
  bairro VARCHAR(120) NOT NULL,
  numero VARCHAR(40) NOT NULL,
  cidade VARCHAR(120) NOT NULL,
  estado VARCHAR(80) NOT NULL,
  responsavel_inscricao ENUM('Empresa', 'Particular') NOT NULL,
  empresa_id INT,
  empresa VARCHAR(191),
  sonda_unidade VARCHAR(191) NOT NULL,
  operacao ENUM('Workover', 'Perfuração', 'Perfuração + Workover') NOT NULL,
  funcao ENUM('Plataformista', 'Torrista', 'Sondador', 'Encarregado', 'Coordenador', 'Téc. operação', 'Operador', 'Engenheiro', 'Supervisor', 'Outro') NOT NULL,
  funcao_outro VARCHAR(120),
  observacao TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_alunos_cpf (cpf),
  UNIQUE KEY uq_alunos_email (email),
  INDEX idx_alunos_criado_em (criado_em),
  INDEX idx_alunos_empresa_id (empresa_id),
  CONSTRAINT fk_alunos_empresa
    FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS instrutores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_instrutores_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locais (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_locais_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS salas_online (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_salas_online_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classificacoes_presenca (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  descricao TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_classificacoes_presenca_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classificacoes_cursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  descricao TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_classificacoes_cursos_nome (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(191) NOT NULL,
  classificacao_id INT NOT NULL,
  descricao TEXT NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cursos_nome (nome),
  INDEX idx_cursos_classificacao_id (classificacao_id),
  CONSTRAINT fk_cursos_classificacao
    FOREIGN KEY (classificacao_id) REFERENCES classificacoes_cursos(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS turmas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  instrutor_id INT NOT NULL,
  local VARCHAR(191),
  sala_online VARCHAR(191),
  observacao TEXT,
  status ENUM('Em andamento', 'Concluído') NOT NULL DEFAULT 'Em andamento',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_turmas_datas (data_inicio, data_fim),
  INDEX idx_turmas_curso_id (curso_id),
  INDEX idx_turmas_instrutor_id (instrutor_id),
  CONSTRAINT fk_turmas_curso
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_turmas_instrutor
    FOREIGN KEY (instrutor_id) REFERENCES instrutores(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS turma_alunos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  turma_id INT NOT NULL,
  aluno_id INT NOT NULL,
  classificacao_presenca_id INT NOT NULL,
  status ENUM('Em andamento', 'Concluído') NOT NULL DEFAULT 'Em andamento',
  matriculado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  concluido_em DATETIME,
  UNIQUE KEY uq_turma_aluno (turma_id, aluno_id),
  INDEX idx_turma_alunos_status (status),
  INDEX idx_turma_alunos_aluno_id (aluno_id),
  INDEX idx_turma_alunos_classificacao_presenca_id (classificacao_presenca_id),
  CONSTRAINT fk_turma_alunos_turma
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_turma_alunos_aluno
    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_turma_alunos_classificacao_presenca
    FOREIGN KEY (classificacao_presenca_id) REFERENCES classificacoes_presenca(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS aluno_documentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id INT NOT NULL,
  turma_id INT,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_arquivo VARCHAR(120),
  tamanho_bytes BIGINT,
  drive_file_id VARCHAR(191),
  drive_folder_id VARCHAR(191),
  drive_url TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_aluno_documentos_aluno_id (aluno_id),
  INDEX idx_aluno_documentos_turma_id (turma_id),
  INDEX idx_aluno_documentos_drive_file_id (drive_file_id),
  CONSTRAINT fk_aluno_documentos_aluno
    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_aluno_documentos_turma
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS avaliacoes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id INT NOT NULL,
  turma_id INT NOT NULL,
  curso_id INT NOT NULL,
  instrutor_id INT NOT NULL,
  data_avaliacao DATE NOT NULL,
  nota_1 TINYINT NOT NULL CHECK (nota_1 BETWEEN 1 AND 5),
  nota_2 TINYINT NOT NULL CHECK (nota_2 BETWEEN 1 AND 5),
  nota_3 TINYINT NOT NULL CHECK (nota_3 BETWEEN 1 AND 5),
  nota_4 TINYINT NOT NULL CHECK (nota_4 BETWEEN 1 AND 5),
  nota_5 TINYINT NOT NULL CHECK (nota_5 BETWEEN 1 AND 5),
  nota_6 TINYINT NOT NULL CHECK (nota_6 BETWEEN 1 AND 5),
  nota_7 TINYINT NOT NULL CHECK (nota_7 BETWEEN 1 AND 5),
  nota_8 TINYINT NOT NULL CHECK (nota_8 BETWEEN 1 AND 5),
  nota_9 TINYINT NOT NULL CHECK (nota_9 BETWEEN 1 AND 5),
  nota_10 TINYINT NOT NULL CHECK (nota_10 BETWEEN 1 AND 5),
  nota_11 TINYINT NOT NULL CHECK (nota_11 BETWEEN 1 AND 5),
  nota_12 TINYINT NOT NULL CHECK (nota_12 BETWEEN 1 AND 5),
  nota_13 TINYINT NOT NULL CHECK (nota_13 BETWEEN 1 AND 5),
  nota_14 TINYINT NOT NULL CHECK (nota_14 BETWEEN 1 AND 5),
  nota_geral DECIMAL(4,2) NOT NULL CHECK (nota_geral BETWEEN 0 AND 10),
  teste_zoom ENUM('Sim', 'Não') NOT NULL,
  comentario TEXT,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_avaliacoes_aluno_turma (aluno_id, turma_id),
  INDEX idx_avaliacoes_turma (turma_id),
  INDEX idx_avaliacoes_curso_id (curso_id),
  INDEX idx_avaliacoes_instrutor_id (instrutor_id),
  INDEX idx_avaliacoes_data (data_avaliacao),
  CONSTRAINT fk_avaliacoes_aluno
    FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_avaliacoes_turma
    FOREIGN KEY (turma_id) REFERENCES turmas(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_avaliacoes_curso
    FOREIGN KEY (curso_id) REFERENCES cursos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_avaliacoes_instrutor
    FOREIGN KEY (instrutor_id) REFERENCES instrutores(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
