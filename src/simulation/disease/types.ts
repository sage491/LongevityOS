/**
 * @file types.ts
 * @description Core types and interfaces for the modular disease and health-state foundation (Phase C).
 */

import { BiologicalSex } from '../types';

export type DiseaseCategory =
  | 'Cardiovascular disease'
  | 'Type 2 diabetes / metabolic disease'
  | 'Chronic respiratory disease'
  | 'Cancer'
  | 'Infectious disease';

export type DiseaseSeverity = 'Mild' | 'Moderate' | 'Severe' | 'Critical';

export type OrganSystem =
  | 'Cardiovascular'
  | 'Metabolic / Endocrine'
  | 'Respiratory'
  | 'Systemic / Oncology'
  | 'Immune / Infectious';

export interface DiseaseRecord {
  diseaseId: string;
  diseaseCategory: DiseaseCategory;
  onsetYear: number;
  onsetAge: number;
  severity: DiseaseSeverity;
  progressionRate: number; // MODEL ASSUMPTION: annual transition probability to worse severity
  active: boolean;
  resolved: boolean;
  chronic: boolean;
  riskContribution: number; // impact on health/mortality risk
  organSystem: OrganSystem;
  lastUpdatedYear: number;
}

export interface DiseaseStatistics {
  totalActiveDiseases: number;
  diseasePrevalenceRate: number; // active cases per 1,000 living
  newCasesThisYear: number;
  recoveredCasesTotal: number;
  severityDistribution: Record<DiseaseSeverity, number>;
  prevalenceByCategory: Record<DiseaseCategory, number>;
  prevalenceByAgeGroup: Record<string, number>;
  prevalenceBySex: Record<BiologicalSex, number>;
  averageOnsetAge: number;
}
