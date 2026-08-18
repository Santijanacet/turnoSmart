import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function ensureSeedData() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const adminEmail = 'admin@turnosmart.com';
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'turnosmart-admin' },
    update: {},
    create: {
      name: 'TurnoSmart Admin',
      slug: 'turnosmart-admin',
    },
  });

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Admin',
        lastName: 'TurnoSmart',
        role: 'ADMIN',
        tenantId: tenant.id,
      },
    });

    console.log('Seed admin created: admin@turnosmart.com / admin123');
  }

  const defaultDepartments = ['Urgencias', 'Hospitalización', 'Laboratorio'];
  for (const name of defaultDepartments) {
    const code = name.toLowerCase().replace(/\s+/g, '-');
    await prisma.department.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: {},
      create: {
        name,
        code,
        tenantId: tenant.id,
      },
    });
  }

  const defaultTypes = [
    'Médico',
    'Enfermero',
    'Auxiliar',
    'Camillero',
    'Personal administrativo',
    'Técnico',
  ];

  for (const name of defaultTypes) {
    await prisma.employeeType.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
      },
    });
  }

  const defaultShiftTypes = [
    { name: 'Turno mañana', code: 'MANANA', startTime: '07:00', endTime: '15:00', duration: 8, color: '#2563eb' },
    { name: 'Turno tarde', code: 'TARDE', startTime: '15:00', endTime: '23:00', duration: 8, color: '#f59e0b' },
    { name: 'Turno noche', code: 'NOCHE', startTime: '23:00', endTime: '07:00', duration: 8, color: '#334155', nightShift: true },
  ];

  for (const shiftType of defaultShiftTypes) {
    await prisma.shiftType.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: shiftType.code } },
      update: shiftType,
      create: { tenantId: tenant.id, ...shiftType },
    });
  }

  await prisma.$disconnect();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('TurnoSmart API')
    .setDescription('API para gestión de turnos hospitalarios')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await ensureSeedData();

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`TurnoSmart API running on: http://localhost:${port}`);
}

bootstrap();
