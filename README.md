# Service Of WellControl

Sistema web completo para gestao de cursos na area de petroleo, com cadastro publico de alunos, painel administrativo, cursos, turmas, avaliacoes, dashboards e calendario.

## Tecnologias

- Frontend: React + Vite
- Backend: Node.js + Express
- Banco SQL: MySQL
- Autenticacao: JWT
- Senhas: bcrypt

## Execucao

1. Instale as dependencias da raiz:

```bash
npm install
```

2. Instale frontend e backend:

```bash
npm run install:all
```

3. Configure o MySQL.

Crie o arquivo `backend/.env` a partir de `backend/.env.example` e ajuste, se necessario:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=service_of_wellcontrol
```

4. Inicialize o banco:

```bash
npm run db:init
```

5. Rode backend e frontend:

```bash
npm run dev
```

Frontend: http://localhost:5173

Backend: http://localhost:3333/api

## Admin inicial

O banco cria automaticamente um usuario administrador:

- Email: `admin@swc.com`
- Senha: `admin123`

Altere esses dados em producao usando variaveis de ambiente.

## Banco de dados

O script SQL completo esta em:

```text
backend/database/schema.sql
```

O script cria automaticamente o banco MySQL padrao:

```text
service_of_wellcontrol
```

## Variaveis de ambiente

Copie `backend/.env.example` para `backend/.env` se quiser customizar porta, JWT, conexao MySQL e credenciais do admin.

### Google Drive para documentos de alunos

O anexo de documentos usa a API do Google Drive quando `GOOGLE_DRIVE_ENABLED=true`.

Variaveis principais:

```env
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_CREDENTIALS_JSON=
GOOGLE_DRIVE_CREDENTIALS_FILE=
GOOGLE_DRIVE_PARENT_FOLDER_ID=
GOOGLE_DRIVE_STUDENTS_FOLDER_ID=
GOOGLE_DRIVE_STUDENTS_FOLDER_NAME=Alunos
GOOGLE_DRIVE_MAKE_FILES_PUBLIC=false
GOOGLE_DRIVE_DELETE_FILES=true
GOOGLE_DRIVE_MAX_UPLOAD_MB=25
```

Use apenas uma das opcoes de credenciais:

- `GOOGLE_DRIVE_CREDENTIALS_JSON`: JSON da service account em base64.
- `GOOGLE_DRIVE_CREDENTIALS_FILE`: caminho para o arquivo JSON da service account.
- `GOOGLE_DRIVE_AUTH_TYPE=oauth`: usa um OAuth Client com `GOOGLE_DRIVE_OAUTH_CLIENT_FILE` e `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN`.

Se `GOOGLE_DRIVE_STUDENTS_FOLDER_ID` ficar vazio, o sistema procura ou cria a pasta `Alunos`. Dentro dela, cria uma pasta por aluno com o nome completo do estudante.

Para gerar o refresh token no modo OAuth:

```bash
npm run drive:auth --prefix backend
```

Antes de rodar o comando, cadastre `http://localhost:4100/oauth2callback` nos URIs de redirecionamento autorizados do OAuth Client no Google Cloud Console.
