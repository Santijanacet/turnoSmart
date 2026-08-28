import { describe, expect, it } from 'vitest';
import { getEligibleEmployees, type EmployeeCandidate, type ExistingShiftEntry, type ShiftToCover } from './assignment-engine.logic';

const DEPT = 'urgencias';
const OTHER_DEPT = 'laboratorio';

function makeShift(overrides: Partial<ShiftToCover> = {}): ShiftToCover {
  return {
    id: 'shift-1',
    departmentId: DEPT,
    start: new Date('2026-08-25T08:00:00'),
    end: new Date('2026-08-25T16:00:00'),
    isNight: false,
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<EmployeeCandidate> = {}): EmployeeCandidate {
  return {
    id: 'emp-1',
    name: 'Juan Pérez',
    active: true,
    employeeTypeId: 'medico',
    certifiedDepartmentIds: [DEPT],
    pastDepartmentIds: [],
    ...overrides,
  };
}

const rules = {
  minRestHours: 12,
  maxHoursPerWeek: 48,
  maxNightShiftsPerPeriod: 2,
  periodStart: new Date('2026-08-24T00:00:00'),
  periodEnd: new Date('2026-08-31T00:00:00'),
};

describe('getEligibleEmployees', () => {
  it('marca como no elegible a un empleado inactivo', () => {
    const [result] = getEligibleEmployees(makeShift(), [makeEmployee({ active: false })], [], rules);
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons).toContain('El empleado se encuentra inactivo.');
  });

  it('excluye a quien no está certificado para el área', () => {
    const [result] = getEligibleEmployees(
      makeShift({ departmentId: OTHER_DEPT }),
      [makeEmployee({ certifiedDepartmentIds: [DEPT] })],
      [],
      rules,
    );
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons).toContain('El empleado no está habilitado/certificado para esta área.');
  });

  it('excluye por solapamiento de horario', () => {
    const existing: ExistingShiftEntry[] = [{
      employeeId: 'emp-1',
      shiftId: 'shift-0',
      start: new Date('2026-08-25T12:00:00'),
      end: new Date('2026-08-25T20:00:00'),
      isNight: false,
      kind: 'ASSIGNMENT',
    }];
    const [result] = getEligibleEmployees(makeShift(), [makeEmployee()], existing, rules);
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons).toContain('El empleado tiene un turno que se solapa con el horario solicitado.');
  });

  it('excluye cuando no se respeta el descanso mínimo', () => {
    const existing: ExistingShiftEntry[] = [{
      employeeId: 'emp-1',
      shiftId: 'shift-0',
      start: new Date('2026-08-24T22:00:00'),
      end: new Date('2026-08-25T06:00:00'),
      isNight: true,
      kind: 'ASSIGNMENT',
    }];
    const [result] = getEligibleEmployees(makeShift(), [makeEmployee()], existing, rules);
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons.some((reason) => reason.includes('descanso mínimo'))).toBe(true);
  });

  it('excluye cuando se supera el máximo de horas del periodo', () => {
    const existing: ExistingShiftEntry[] = [{
      employeeId: 'emp-1',
      shiftId: 'shift-0',
      start: new Date('2026-08-24T08:00:00'),
      end: new Date('2026-08-24T20:00:00'),
      isNight: false,
      kind: 'ASSIGNMENT',
    }];
    const [result] = getEligibleEmployees(makeShift(), [makeEmployee()], existing, { ...rules, maxHoursPerWeek: 15 });
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons.some((reason) => reason.includes('máximo de horas'))).toBe(true);
  });

  it('excluye por licencia/vacaciones aprobadas en la fecha del turno', () => {
    const existing: ExistingShiftEntry[] = [{
      employeeId: 'emp-1',
      shiftId: 'leave-1',
      start: new Date('2026-08-25T00:00:00'),
      end: new Date('2026-08-26T00:00:00'),
      isNight: false,
      kind: 'APPROVED_LEAVE',
    }];
    const [result] = getEligibleEmployees(makeShift(), [makeEmployee()], existing, rules);
    expect(result.eligible).toBe(false);
    expect(result.exclusionReasons).toContain('El empleado tiene una licencia, vacaciones o día libre aprobado en esta fecha.');
  });

  it('prioriza (mayor score) a quien tiene menos horas acumuladas', () => {
    const busyEmployee = makeEmployee({ id: 'emp-busy', name: 'Empleado ocupado' });
    const restedEmployee = makeEmployee({ id: 'emp-rested', name: 'Empleado descansado' });
    const existing: ExistingShiftEntry[] = [{
      employeeId: 'emp-busy',
      shiftId: 'shift-0',
      start: new Date('2026-08-24T08:00:00'),
      end: new Date('2026-08-24T16:00:00'),
      isNight: false,
      kind: 'ASSIGNMENT',
    }];
    const [first, second] = getEligibleEmployees(makeShift(), [busyEmployee, restedEmployee], existing, rules);
    expect(first.employeeId).toBe('emp-rested');
    expect(second.employeeId).toBe('emp-busy');
    expect(first.score).toBeGreaterThan(second.score);
  });

  it('da puntaje extra a quien ya trabajó antes en la misma área', () => {
    const withHistory = makeEmployee({ id: 'emp-history', name: 'Con experiencia', pastDepartmentIds: [DEPT] });
    const withoutHistory = makeEmployee({ id: 'emp-new', name: 'Sin experiencia' });
    const [first] = getEligibleEmployees(makeShift(), [withoutHistory, withHistory], [], rules);
    expect(first.employeeId).toBe('emp-history');
  });

  it('ordena elegibles antes que no elegibles', () => {
    const eligible = makeEmployee({ id: 'emp-ok', name: 'Disponible' });
    const ineligible = makeEmployee({ id: 'emp-bad', name: 'Inactivo', active: false });
    const results = getEligibleEmployees(makeShift(), [ineligible, eligible], [], rules);
    expect(results[0].employeeId).toBe('emp-ok');
    expect(results[1].employeeId).toBe('emp-bad');
  });
});
