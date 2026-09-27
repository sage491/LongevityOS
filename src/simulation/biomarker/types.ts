/**
 * @file biomarker/types.ts
 * @description Domain types and interfaces for Phase D Biomarkers & Biological Aging.
 */

export interface BiomarkerProfile {
  cardiovascular: number; // 0 - 100
  metabolic: number;      // 0 - 100
  respiratory: number;    // 0 - 100
  musculoskeletal: number;// 0 - 100
  immune: number;         // 0 - 100
  neurological: number;   // 0 - 100
  systemic: number;       // 0 - 100
}

export interface BiomarkerHistoryRecord {
  year: number;
  chronologicalAge: number;
  biologicalAge: number;
  agingVelocity: number;
  health: number;
  biomarkers: BiomarkerProfile;
  activeDiseaseCount: number;
}

export interface AgingState {
  biologicalAge: number;
  agingVelocity: number;
  biomarkerHistory: BiomarkerHistoryRecord[];
}
