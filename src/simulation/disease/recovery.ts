/**
 * @file recovery.ts
 * @description Disease recovery and resolution rules for infectious and chronic conditions (Phase C).
 */

import { DiseaseRecord } from './types';

export function evaluateDiseaseRecovery(disease: DiseaseRecord, currentYear: number): DiseaseRecord {
  if (!disease.active || disease.resolved) {
    return disease;
  }

  if (disease.diseaseCategory === 'Infectious disease') {
    let recoveryChance = 0.35;
    if (disease.severity === 'Severe') recoveryChance = 0.15;
    if (disease.severity === 'Critical') recoveryChance = 0.05;

    if (Math.random() < recoveryChance) {
      return {
        ...disease,
        active: false,
        resolved: true,
        riskContribution: 0,
        lastUpdatedYear: currentYear,
      };
    }
  }

  if (disease.diseaseCategory === 'Cancer' && disease.severity !== 'Critical') {
    if (Math.random() < 0.02) {
      return {
        ...disease,
        active: false,
        resolved: true,
        riskContribution: 2.0,
        lastUpdatedYear: currentYear,
      };
    }
  }

  return disease;
}
