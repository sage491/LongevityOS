/**
 * @file constants.ts
 * @description Disease templates, categories, and configurable model assumption parameters (Phase C).
 */

import { DiseaseCategory, OrganSystem } from './types';

export interface DiseaseTemplate {
  category: DiseaseCategory;
  organSystem: OrganSystem;
  chronic: boolean;
  baseAnnualOnsetRisk: number; // MODEL ASSUMPTION
  progressionRate: number; // MODEL ASSUMPTION
  baseRiskContribution: number;
}

export const DISEASE_TEMPLATES: DiseaseTemplate[] = [
  {
    category: 'Cardiovascular disease',
    organSystem: 'Cardiovascular',
    chronic: true,
    baseAnnualOnsetRisk: 0.015, // MODEL ASSUMPTION
    progressionRate: 0.10, // MODEL ASSUMPTION
    baseRiskContribution: 15.0,
  },
  {
    category: 'Type 2 diabetes / metabolic disease',
    organSystem: 'Metabolic / Endocrine',
    chronic: true,
    baseAnnualOnsetRisk: 0.020, // MODEL ASSUMPTION
    progressionRate: 0.08, // MODEL ASSUMPTION
    baseRiskContribution: 10.0,
  },
  {
    category: 'Chronic respiratory disease',
    organSystem: 'Respiratory',
    chronic: true,
    baseAnnualOnsetRisk: 0.012, // MODEL ASSUMPTION
    progressionRate: 0.07, // MODEL ASSUMPTION
    baseRiskContribution: 12.0,
  },
  {
    category: 'Cancer',
    organSystem: 'Systemic / Oncology',
    chronic: true,
    baseAnnualOnsetRisk: 0.006, // MODEL ASSUMPTION
    progressionRate: 0.15, // MODEL ASSUMPTION
    baseRiskContribution: 25.0,
  },
  {
    category: 'Infectious disease',
    organSystem: 'Immune / Infectious',
    chronic: false,
    baseAnnualOnsetRisk: 0.035, // MODEL ASSUMPTION
    progressionRate: 0.20, // MODEL ASSUMPTION
    baseRiskContribution: 8.0,
  },
];
