// Lógica pura del motor de asignación automática de turnos.
// No depende de Prisma ni de NestJS: recibe datos ya normalizados y devuelve
// un resultado determinista, para poder testearla de forma aislada.

const MS_PER_HOUR = 1000 * 60 * 60;

export type ExistingShiftKind = 'ASSIGNMENT' | 'APPROVED_LEAVE';

export interface ShiftToCover {
  id: string;
  departmentId: string | null;
  start: Date;
  end: Date;
  isNight: boolean;
}

export interface EmployeeCandidate {
  id: string;
  name: string;
  active: boolean;
  employeeTypeId: string | null;
  /** Áreas donde el empleado está habilitado/certificado (departamento principal + adicionales). */
  certifiedDepartmentIds: string[];
  /** Áreas donde el empleado ya trabajó antes (para dar preferencia por experiencia previa). */
  pastDepartmentIds: string[];
}

export interface ExistingShiftEntry {
  employeeId: string;
  shiftId: string;
  start: Date;
  end: Date;
  isNight: boolean;
  /** ASSIGNMENT = turno ya asignado. APPROVED_LEAVE = licencia/vacaciones/día libre aprobado. */
  kind: ExistingShiftKind;
}

export interface AssignmentRules {
  /** Horas mínimas de descanso entre dos turnos del mismo empleado. */
  minRestHours: number;
  /** Máximo de horas permitidas dentro de la ventana [periodStart, periodEnd]. */
  maxHoursPerWeek: number;
  /** Máximo de turnos nocturnos permitidos dentro de la misma ventana (opcional). */
  maxNightShiftsPerPeriod?: number;
  /** Ventana usada para calcular horas/noches acumuladas (p. ej. la semana del turno). */
  periodStart: Date;
  periodEnd: Date;
}

export interface CandidateEvaluation {
  employeeId: string;
  employeeName: string;
  eligible: boolean;
  score: number;
  currentHours: number;
  totalAssignments: number;
  lastShiftEnd: Date | null;
  exclusionReasons: string[];
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Evalúa y ordena empleados candidatos para cubrir un turno, aplicando en orden:
 * elegibilidad por área, descanso mínimo, solapamiento, máximo de horas,
 * solicitudes aprobadas (licencia/vacaciones/día libre), balanceo de carga y
 * preferencia por experiencia previa en el área.
 */
export function getEligibleEmployees(
  shift: ShiftToCover,
  employees: EmployeeCandidate[],
  existingShifts: ExistingShiftEntry[],
  rules: AssignmentRules,
): CandidateEvaluation[] {
  const results = employees.map((employee): CandidateEvaluation => {
    const reasons: string[] = [];
    const ownEntries = existingShifts.filter((entry) => entry.employeeId === employee.id);

    if (!employee.active) {
      reasons.push('El empleado se encuentra inactivo.');
    }

    if (shift.departmentId && !employee.certifiedDepartmentIds.includes(shift.departmentId)) {
      reasons.push('El empleado no está habilitado/certificado para esta área.');
    }

    const alreadyOnThisShift = ownEntries.some(
      (entry) => entry.kind === 'ASSIGNMENT' && entry.shiftId === shift.id,
    );
    if (alreadyOnThisShift) {
      reasons.push('El empleado ya está asignado a este turno.');
    }

    const hasApprovedLeave = ownEntries.some(
      (entry) => entry.kind === 'APPROVED_LEAVE' && overlaps(shift.start, shift.end, entry.start, entry.end),
    );
    if (hasApprovedLeave) {
      reasons.push('El empleado tiene una licencia, vacaciones o día libre aprobado en esta fecha.');
    }

    let hasOverlap = false;
    let restViolation = false;
    let hoursInPeriod = 0;
    let nightShiftsInPeriod = 0;
    let lastShiftEnd: Date | null = null;
    let assignmentsCount = 0;

    for (const entry of ownEntries) {
      if (entry.kind !== 'ASSIGNMENT' || entry.shiftId === shift.id) continue;
      assignmentsCount += 1;
      const durationHours = (entry.end.getTime() - entry.start.getTime()) / MS_PER_HOUR;

      if (overlaps(shift.start, shift.end, entry.start, entry.end)) {
        hasOverlap = true;
      } else {
        const gapHours = entry.end <= shift.start
          ? (shift.start.getTime() - entry.end.getTime()) / MS_PER_HOUR
          : (entry.start.getTime() - shift.end.getTime()) / MS_PER_HOUR;
        if (gapHours >= 0 && gapHours < rules.minRestHours) {
          restViolation = true;
        }
      }

      if (overlaps(rules.periodStart, rules.periodEnd, entry.start, entry.end)) {
        hoursInPeriod += durationHours;
        if (entry.isNight) nightShiftsInPeriod += 1;
      }

      if (!lastShiftEnd || entry.end > lastShiftEnd) {
        lastShiftEnd = entry.end;
      }
    }

    if (hasOverlap) {
      reasons.push('El empleado tiene un turno que se solapa con el horario solicitado.');
    }
    if (restViolation) {
      reasons.push(`El empleado no cumple el descanso mínimo de ${rules.minRestHours} horas.`);
    }

    const shiftHours = (shift.end.getTime() - shift.start.getTime()) / MS_PER_HOUR;
    const projectedHours = hoursInPeriod + shiftHours;
    if (projectedHours > rules.maxHoursPerWeek) {
      reasons.push(`El empleado superaría el máximo de horas permitido para el periodo (${rules.maxHoursPerWeek}h).`);
    }
    if (
      shift.isNight &&
      rules.maxNightShiftsPerPeriod !== undefined &&
      nightShiftsInPeriod >= rules.maxNightShiftsPerPeriod
    ) {
      reasons.push(`El empleado alcanzó el máximo de turnos nocturnos permitidos (${rules.maxNightShiftsPerPeriod}).`);
    }

    // Balanceo de carga: menos horas/turnos acumulados => mayor prioridad.
    let score = 100;
    score -= hoursInPeriod * 1.5;
    score -= assignmentsCount * 2;
    score -= nightShiftsInPeriod * 3;

    // Preferencia por experiencia previa en la misma área.
    if (shift.departmentId && employee.pastDepartmentIds.includes(shift.departmentId)) {
      score += 15;
    }

    // A mayor tiempo desde el último turno, mayor prioridad (tope de 10 puntos).
    if (lastShiftEnd) {
      const idleDays = (shift.start.getTime() - lastShiftEnd.getTime()) / MS_PER_HOUR / 24;
      score += Math.max(0, Math.min(idleDays, 10));
    } else {
      score += 10;
    }

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      eligible: reasons.length === 0,
      score: Math.round(score * 100) / 100,
      currentHours: Math.round(hoursInPeriod * 100) / 100,
      totalAssignments: assignmentsCount,
      lastShiftEnd,
      exclusionReasons: reasons,
    };
  });

  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    return a.employeeName.localeCompare(b.employeeName);
  });
}
