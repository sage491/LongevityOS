/**
 * @file risk.ts
 * @description Modular risk calculation for disease onset based on age, biological age, health, inherited susceptibility, and comorbidity (Phase C).
 */

import { Human } from '../types';
import { DiseaseTemplate } from './constants';

/**
 * Calculates individual annual probability of disease development.
 * 
 * MODEL ASSUMPTION:
 * disease risk = baseline age risk * biological-age modifier * health modifier * inherited-risk modifier * existing-risk modifiers
 */
export function calculateDiseaseRisk(human: Human, template: DiseaseTemplate): number {
  if (!human.alive) return 0;

  let ageFactor = 1.0;
  if (template.category === 'Infectious disease') {
    ageFactor = human.age < 5 ? 1.5 : (human.age > 65 ? 1.3 : 1.0);
  } else {
    ageFactor = Math.max(0.1, Math.exp((human.age - 35) * 0.04));
  }

  const baselineRisk = template.baseAnnualOnsetRisk * ageFactor;

  const bioAgeGap = human.biologicalAge - human.age;
  const bioAgeModifier = Math.max(0.5, 1.0 + (bioAgeGap * 0.03));

  const healthModifier = Math.max(0.5, 2.0 - (human.health / 100));

  let inheritedModifier = 1.0;
  if (template.category === 'Cardiovascular disease') {
    inheritedModifier = human.inheritedCardiovascularRisk ?? 1.0;
  } else if (template.category === 'Type 2 diabetes / metabolic disease') {
    inheritedModifier = human.inheritedMetabolicRisk ?? 1.0;
  } else if (template.category === 'Chronic respiratory disease') {
    inheritedModifier = human.inheritedRespiratoryRisk ?? 1.0;
  } else if (template.category === 'Cancer') {
    inheritedModifier = human.inheritedCancerRisk ?? 1.0;
  } else if (template.category === 'Infectious disease') {
    inheritedModifier = human.inheritedInfectiousRisk ?? 1.0;
  }

  const activeCount = (human.diseases ?? []).filter(d => d.active).length;
  const comorbidityModifier = 1.0 + (activeCount * 0.15);

  const finalRisk = baselineRisk * bioAgeModifier * healthModifier * inheritedModifier * comorbidityModifier;

  return Math.min(0.5, Math.max(0.0001, finalRisk));
}
