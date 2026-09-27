/**
 * @file biomarker/dynamics.ts
 * @description Annual biomarker update mechanics, disease-to-biomarker coupling, and stochastic variation.
 */

import { BiomarkerProfile } from './types';
import { DiseaseRecord } from '../disease/types';
import { getExpectedBiomarker } from './norms';

/**
 * Initializes biomarker profile for a new human based on age and genetic predisposition.
 */
export function initializeBiomarkerProfile(age: number): BiomarkerProfile {
  const expectedCardio = getExpectedBiomarker('cardiovascular', age);
  const expectedMetabolic = getExpectedBiomarker('metabolic', age);
  const expectedResp = getExpectedBiomarker('respiratory', age);
  const expectedMusc = getExpectedBiomarker('musculoskeletal', age);
  const expectedImmune = getExpectedBiomarker('immune', age);
  const expectedNeuro = getExpectedBiomarker('neurological', age);
  const expectedSys = getExpectedBiomarker('systemic', age);

  const jitter = (base: number) => Math.max(10, Math.min(100, base + (Math.random() * 6 - 3)));

  return {
    cardiovascular: jitter(expectedCardio),
    metabolic: jitter(expectedMetabolic),
    respiratory: jitter(expectedResp),
    musculoskeletal: jitter(expectedMusc),
    immune: jitter(expectedImmune),
    neurological: jitter(expectedNeuro),
    systemic: jitter(expectedSys),
  };
}

/**
 * Updates an agent's biomarker profile annually based on aging, disease burden, stochastic noise, and recovery.
 */
export function updateBiomarkersAnnually(
  chronologicalAge: number,
  currentProfile: BiomarkerProfile,
  activeDiseases: DiseaseRecord[],
  health: number,
  randomSeedOffset: number = 0
): BiomarkerProfile {
  const updated: BiomarkerProfile = { ...currentProfile };
  const domains: Array<keyof BiomarkerProfile> = [
    'cardiovascular',
    'metabolic',
    'respiratory',
    'musculoskeletal',
    'immune',
    'neurological',
    'systemic',
  ];

  for (let idx = 0; idx < domains.length; idx++) {
    const domain = domains[idx];
    const expected = getExpectedBiomarker(domain, chronologicalAge);
    const prev = updated[domain];

    const stochasticNoise = ((Math.sin(chronologicalAge * 12.9898 + idx * 78.233 + randomSeedOffset) * 43758.5453) % 1) * 1.2 - 0.6;
    const naturalDrift = (expected - prev) * 0.15;
    const healthPressure = (health - 70) * 0.02;

    let nextVal = prev + naturalDrift + stochasticNoise + healthPressure;

    // Disease coupling
    for (const d of activeDiseases) {
      if (!d.active) continue;
      const severityMultiplier = d.severity === 'Critical' ? 4.0 : d.severity === 'Severe' ? 2.5 : d.severity === 'Moderate' ? 1.5 : 1.0;

      if (d.diseaseCategory === 'Cardiovascular disease' && (domain === 'cardiovascular' || domain === 'systemic')) {
        nextVal -= 1.8 * severityMultiplier;
      } else if (d.diseaseCategory === 'Type 2 diabetes / metabolic disease' && (domain === 'metabolic' || domain === 'cardiovascular')) {
        nextVal -= 1.6 * severityMultiplier;
      } else if (d.diseaseCategory === 'Chronic respiratory disease' && (domain === 'respiratory' || domain === 'systemic')) {
        nextVal -= 1.7 * severityMultiplier;
      } else if (d.diseaseCategory === 'Cancer' && (domain === 'systemic' || domain === 'immune')) {
        nextVal -= 2.5 * severityMultiplier;
      } else if (d.diseaseCategory === 'Infectious disease' && (domain === 'immune' || domain === 'systemic')) {
        nextVal -= 2.0 * severityMultiplier;
      }
    }

    // Recovery restoration
    const hasActiveDisease = activeDiseases.some(d => d.active);
    if (!hasActiveDisease && prev < expected) {
      nextVal += (expected - prev) * 0.25;
    }

    if (isNaN(nextVal) || !isFinite(nextVal)) {
      nextVal = expected;
    }
    updated[domain] = Math.max(10.0, Math.min(100.0, nextVal));
  }

  return updated;
}

export const updateBiomarkerProfile = updateBiomarkersAnnually;
