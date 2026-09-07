// Lógica pura para determinar el estado de cobertura de un turno a partir de
// sus requerimientos de personal. Sin dependencias de Prisma/Nest, igual que
// assignment-engine.logic.ts, para poder testearla de forma aislada.

export type ShiftCoverageStatus = 'UNCOVERED' | 'PARTIALLY_COVERED' | 'COVERED';

export interface CoverageRequirement {
  requiredCount: number;
  assignedCount: number;
}

/**
 * Evalúa por rol, no por suma total: "cubierto" exige que CADA requerimiento
 * tenga suficientes asignados, no que la suma total alcance. Así evita que,
 * por ejemplo, 5 médicos asignados cuenten como cobertura de un cupo que
 * necesitaba 3 médicos y 2 enfermeros.
 */
export function computeCoverageStatus(requirements: CoverageRequirement[]): ShiftCoverageStatus {
  if (!requirements.length) return 'UNCOVERED';
  if (requirements.every((requirement) => requirement.assignedCount >= requirement.requiredCount)) {
    return 'COVERED';
  }
  if (requirements.some((requirement) => requirement.assignedCount > 0)) {
    return 'PARTIALLY_COVERED';
  }
  return 'UNCOVERED';
}
