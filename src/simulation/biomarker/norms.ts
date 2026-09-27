/**
 * @file biomarker/norms.ts
 * @description Age-specific biomarker expectations and childhood developmental maturation models.
 */

import { BiomarkerProfile } from './types';

export const DEFAULT_PEAK_BIOMARKER = 95.0;

// Configurable senescent decay rates per domain (annual decline per year after age 20)
export const SENESCENT_DECAY_RATES: Record<keyof BiomarkerProfile, number> = {
  cardiovascular: 0.35,
  metabolic: 0.30,
  respiratory: 0.40,
  musculoskeletal: 0.45,
  immune: 0.35,
  neurological: 0.25,
  systemic: 0.30,
};

/**
 * Calculates normative expected biomarker value for a given chronological age.
 */
export function getExpectedBiomarker(domain: keyof BiomarkerProfile, chronologicalAge: number): number {
  if (chronologicalAge < 18) {
    // Childhood developmental regime: infant baseline rising to peak at 18
    const infantBaseline = 50.0;
    const peak = DEFAULT_PEAK_BIOMARKER;
    const maturity = Math.max(0, Math.min(1.0, chronologicalAge / 18.0));
    // Non-linear developmental scaling
    const factor = Math.pow(maturity, 0.6);
    return infantBaseline + (peak - infantBaseline) * factor;
  }

  const peak = DEFAULT_PEAK_BIOMARKER;
  const decayRate = SENESCENT_DECAY_RATES[domain] || 0.3;
  const adultYears = chronologicalAge - 20;
  if (adultYears <= 0) return peak;

  const expected = peak - (decayRate * adultYears);
  return Math.max(10.0, Math.min(100.0, expected));
}

/**
 * Returns expected full biomarker profile for a given chronological age.
 */
export function getExpectedBiomarkerProfile(chronologicalAge: number): BiomarkerProfile {
  return {
    cardiovascular: getExpectedBiomarker('cardiovascular', chronologicalAge),
    metabolic: getExpectedBiomarker('metabolic', chronologicalAge),
    respiratory: getExpectedBiomarker('respiratory', chronologicalAge),
    musculoskeletal: getExpectedBiomarker('musculoskeletal', chronologicalAge),
    immune: getExpectedBiomarker('immune', chronologicalAge),
    neurological: getExpectedBiomarker('neurological', chronologicalAge),
    systemic: getExpectedBiomarker('systemic', chronologicalAge),
  };
}
