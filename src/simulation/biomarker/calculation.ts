/**
 * @file biomarker/calculation.ts
 * @description Mathematical formulation for biological age, physiological deficits, and aging velocity.
 */

import { BiomarkerProfile } from './types';
import { getExpectedBiomarker } from './norms';

export const DOMAIN_WEIGHTS: Record<keyof BiomarkerProfile, number> = {
  cardiovascular: 0.20,
  metabolic: 0.20,
  respiratory: 0.15,
  musculoskeletal: 0.10,
  immune: 0.15,
  neurological: 0.10,
  systemic: 0.10,
};

export const BIOLOGICAL_AGE_SCALE_CONSTANT = 25.0;

/**
 * Computes biological age from a biomarker profile and chronological age.
 */
export function computeBiologicalAge(chronologicalAge: number, profile: BiomarkerProfile): number {
  if (chronologicalAge < 18) {
    // Childhood developmental maturity regime
    return chronologicalAge;
  }

  const domains: Array<keyof BiomarkerProfile> = [
    'cardiovascular',
    'metabolic',
    'respiratory',
    'musculoskeletal',
    'immune',
    'neurological',
    'systemic',
  ];

  let weightedDeficitSum = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const actual = profile[domain];
    const expected = getExpectedBiomarker(domain, chronologicalAge);
    const weight = DOMAIN_WEIGHTS[domain] || 0.1;

    if (typeof actual !== 'number' || isNaN(actual)) {
      continue;
    }

    const deficit = Math.max(-2.0, Math.min(2.0, (expected - actual) / Math.max(expected, 1.0)));
    weightedDeficitSum += deficit * weight;
    totalWeight += weight;
  }

  const normalizedDeficit = totalWeight > 0 ? weightedDeficitSum / totalWeight : 0;
  const rawBioAge = chronologicalAge + (normalizedDeficit * BIOLOGICAL_AGE_SCALE_CONSTANT);

  const minBio = Math.max(0, chronologicalAge - 30);
  const maxBio = Math.min(125, chronologicalAge + 45);

  return Math.max(minBio, Math.min(maxBio, rawBioAge));
}

export const calculateBiologicalAge = computeBiologicalAge;

/**
 * Computes aging velocity with exponential moving average smoothing.
 */
export function calculateAgingVelocity(
  currentBioAge: number,
  previousBioAge: number,
  previousVelocity: number = 1.0
): number {
  const deltaBio = currentBioAge - previousBioAge;
  // Raw instantaneous velocity (delta bio age per 1 calendar year)
  const rawVelocity = Math.max(0.4, Math.min(2.2, deltaBio));

  // Exponential moving average smoothing (0.7 current + 0.3 previous)
  const smoothed = (0.7 * rawVelocity) + (0.3 * previousVelocity);
  return Math.max(0.4, Math.min(2.2, smoothed));
}
