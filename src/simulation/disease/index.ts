/**
 * @file index.ts
 * @description Public entry point and annual processing orchestrator for the disease module (Phase C).
 */

export * from './types';
export * from './constants';
export * from './risk';
export * from './onset';
export * from './progression';
export * from './recovery';

import { Human } from '../types';
import { DiseaseStatistics } from './types';
import { evaluateDiseaseOnsets } from './onset';
import { progressDisease } from './progression';
import { evaluateDiseaseRecovery } from './recovery';

export function processAnnualDiseases(
  humans: Human[],
  currentYear: number
): { updatedHumans: Human[]; totalNewCases: number; totalRecoveries: number } {
  let totalNewCases = 0;
  let totalRecoveries = 0;

  const updatedHumans = humans.map(human => {
    if (!human.alive) {
      return human;
    }

    const { updatedHuman: afterOnset, newDiseases } = evaluateDiseaseOnsets(human, currentYear);
    totalNewCases += newDiseases.length;

    const existingDiseases = afterOnset.diseases ?? [];
    const processedDiseases = existingDiseases.map(dis => {
      if (!dis.active) return dis;

      let d = progressDisease(dis, currentYear);
      const prevActive = d.active;
      d = evaluateDiseaseRecovery(d, currentYear);
      if (prevActive && !d.active && d.resolved) {
        totalRecoveries++;
      }
      return d;
    });

    const totalBurden = processedDiseases
      .filter(d => d.active)
      .reduce((sum, d) => sum + d.riskContribution, 0);

    const healthPenalty = Math.min(40, totalBurden * 0.2);
    const adjustedHealth = Math.max(0, afterOnset.health - healthPenalty);

    return {
      ...afterOnset,
      health: adjustedHealth,
      diseases: processedDiseases,
    };
  });

  return { updatedHumans, totalNewCases, totalRecoveries };
}

export function calculateDiseaseStatistics(humans: Human[]): DiseaseStatistics {
  const living = humans.filter(h => h.alive);
  const totalLiving = living.length;

  let totalActiveDiseases = 0;
  const newCasesThisYear = 0;
  let recoveredCasesTotal = 0;
  const severityDistribution: Record<any, number> = { Mild: 0, Moderate: 0, Severe: 0, Critical: 0 };
  const prevalenceByCategory: Record<any, number> = {
    'Cardiovascular disease': 0,
    'Type 2 diabetes / metabolic disease': 0,
    'Chronic respiratory disease': 0,
    'Cancer': 0,
    'Infectious disease': 0,
  };
  const prevalenceByAgeGroup: Record<string, number> = {
    '0-14': 0,
    '15-24': 0,
    '25-44': 0,
    '45-64': 0,
    '65-74': 0,
    '75-84': 0,
    '85+': 0,
  };
  const prevalenceBySex: Record<any, number> = { female: 0, male: 0 };
  let onsetAgeSum = 0;
  let onsetCount = 0;

  for (const h of living) {
    const diseases = h.diseases ?? [];
    for (const d of diseases) {
      if (d.active) {
        totalActiveDiseases++;
        severityDistribution[d.severity] = (severityDistribution[d.severity] || 0) + 1;
        prevalenceByCategory[d.diseaseCategory] = (prevalenceByCategory[d.diseaseCategory] || 0) + 1;
        prevalenceBySex[h.sex] = (prevalenceBySex[h.sex] || 0) + 1;

        onsetAgeSum += d.onsetAge;
        onsetCount++;

        if (h.age <= 14) prevalenceByAgeGroup['0-14']++;
        else if (h.age <= 24) prevalenceByAgeGroup['15-24']++;
        else if (h.age <= 44) prevalenceByAgeGroup['25-44']++;
        else if (h.age <= 64) prevalenceByAgeGroup['45-64']++;
        else if (h.age <= 74) prevalenceByAgeGroup['65-74']++;
        else if (h.age <= 84) prevalenceByAgeGroup['75-84']++;
        else prevalenceByAgeGroup['85+']++;
      }
      if (d.resolved) {
        recoveredCasesTotal++;
      }
    }
  }

  const diseasePrevalenceRate = totalLiving > 0 ? Number(((totalActiveDiseases / totalLiving) * 1000).toFixed(1)) : 0;
  const averageOnsetAge = onsetCount > 0 ? Number((onsetAgeSum / onsetCount).toFixed(1)) : 0;

  return {
    totalActiveDiseases,
    diseasePrevalenceRate,
    newCasesThisYear,
    recoveredCasesTotal,
    severityDistribution,
    prevalenceByCategory,
    prevalenceByAgeGroup,
    prevalenceBySex,
    averageOnsetAge,
  };
}
