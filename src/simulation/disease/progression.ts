/**
 * @file progression.ts
 * @description Gradual severity progression for active diseases (Phase C).
 */

import { DiseaseRecord, DiseaseSeverity } from './types';

const SEVERITY_LEVELS: DiseaseSeverity[] = ['Mild', 'Moderate', 'Severe', 'Critical'];

export function progressDisease(disease: DiseaseRecord, currentYear: number): DiseaseRecord {
  if (!disease.active || disease.resolved) {
    return disease;
  }

  if (Math.random() < disease.progressionRate) {
    const currentIndex = SEVERITY_LEVELS.indexOf(disease.severity);
    if (currentIndex < SEVERITY_LEVELS.length - 1) {
      const nextSeverity = SEVERITY_LEVELS[currentIndex + 1];
      let riskMultiplier = 1.0;
      if (nextSeverity === 'Moderate') riskMultiplier = 1.5;
      else if (nextSeverity === 'Severe') riskMultiplier = 2.2;
      else if (nextSeverity === 'Critical') riskMultiplier = 3.5;

      return {
        ...disease,
        severity: nextSeverity,
        riskContribution: disease.riskContribution * (riskMultiplier > 1 ? 1.3 : 1.0),
        lastUpdatedYear: currentYear,
      };
    }
  }

  return disease;
}
