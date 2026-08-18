# TurnoSmart Node Edition

Proyecto nuevo basado en la idea original de TurnoSmart, pero implementado con:

- React + Vite + TypeScript
- NestJS + TypeScript
- PostgreSQL
- Prisma


## Requisitos

- Node.js 20+
- npm
- PostgreSQL 

## Ejecutar con Docker

```bash
docker compose up --build
```

La app queda disponible en:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api/docs
- PostgreSQL: localhost:5432

## Ejecutar localmente sin Docker

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run start:dev
```

Para ejecutar el backend compilado en producción:

```bash
cd backend
npm run start:prod
```

`start:prod` compila el backend automáticamente antes de ejecutar `dist/main.js`.
No ejecutes `node dist/main`, porque esa ruta no se genera con la configuración actual.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Módulos principales

- Auth
- Users
- Tenants
- Employees
- Departments
- Shifts
- Schedules
- Requests

## Estructura

```text
turnosmart-node/
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── README.md
└── .gitignore
```
