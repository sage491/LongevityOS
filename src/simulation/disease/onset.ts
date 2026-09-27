/**
 * @file onset.ts
 * @description Stochastic annual disease onset evaluation (Phase C).
 */

import { Human } from '../types';
import { DiseaseRecord } from './types';
import { DISEASE_TEMPLATES } from './constants';
import { calculateDiseaseRisk } from './risk';

export function evaluateDiseaseOnsets(human: Human, currentYear: number): { updatedHuman: Human; newDiseases: DiseaseRecord[] } {
  if (!human.alive) {
    return { updatedHuman: human, newDiseases: [] };
  }

  const existingDiseases = human.diseases ?? [];
  const activeCategories = new Set(existingDiseases.filter(d => d.active).map(d => d.diseaseCategory));

  const newDiseases: DiseaseRecord[] = [];
  let nextIdCounter = existingDiseases.length + 1;

  for (const template of DISEASE_TEMPLATES) {
    if (activeCategories.has(template.category)) {
      continue;
    }

    const risk = calculateDiseaseRisk(human, template);
    if (Math.random() < risk) {
      const newDisease: DiseaseRecord = {
        diseaseId: `${human.id}-dis-${currentYear}-${nextIdCounter++}`,
        diseaseCategory: template.category,
        onsetYear: currentYear,
        onsetAge: human.age,
        severity: 'Mild',
        progressionRate: template.progressionRate,
        active: true,
        resolved: false,
        chronic: template.chronic,
        riskContribution: template.baseRiskContribution,
        organSystem: template.organSystem,
        lastUpdatedYear: currentYear,
      };
      newDiseases.push(newDisease);
      activeCategories.add(template.category);
    }
  }

  if (newDiseases.length === 0) {
    return { updatedHuman: human, newDiseases: [] };
  }

  const updatedHuman: Human = {
    ...human,
    diseases: [...existingDiseases, ...newDiseases],
  };

  return { updatedHuman, newDiseases };
}
