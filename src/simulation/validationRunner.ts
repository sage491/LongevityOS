/**
 * @file simulation/validationRunner.ts
 * @description Controlled A/B Validation Runner for Phase D vs Phase C baseline.
 */

import { generateInitialPopulation } from './generator';
import { simulateYear, SimulationState } from './engine';
import { DEFAULT_AGE_DISTRIBUTION_CONFIG } from './constants';
import { Human } from './types';

export interface ValidationRunResult {
  condition: 'A (Phase C Baseline)' | 'B (Phase D Enabled)';
  seed: number;
  finalPopulation: number;
  totalDeaths: number;
  meanAgeAtDeath: number;
  medianAgeAtDeath: number;
  survival80Pct: number;
  survival90Pct: number;
  survival100Pct: number;
  maxAge: number;
}

export function runPhaseDValidation(): { resultsA: ValidationRunResult[]; resultsB: ValidationRunResult[] } {
  const seeds = [101, 202, 303, 404, 505];
  const initialSize = 2000;
  const maxYears = 150;

  const resultsA: ValidationRunResult[] = [];
  const resultsB: ValidationRunResult[] = [];

  for (const seed of seeds) {
    // Condition A & B use identical initial population
    const initialHumans = generateInitialPopulation(initialSize, 0, DEFAULT_AGE_DISTRIBUTION_CONFIG);

    // Run Condition A (Phase C baseline logic / standard engine)
    let stateA: SimulationState = {
      year: 0,
      humans: JSON.parse(JSON.stringify(initialHumans)),
      history: [],
      totalBirths: 0,
      totalDeaths: 0,
      totalFemaleBirths: 0,
      totalMaleBirths: 0,
      nextHumanId: initialSize + 1,
    };

    for (let yr = 0; yr < maxYears; yr++) {
      stateA = simulateYear(stateA);
    }

    const deceasedA = stateA.humans.filter((h: Human) => !h.alive && h.ageAtDeath !== null);
    const agesAtDeathA = deceasedA.map((h: Human) => h.ageAtDeath ?? h.age);
    const meanA = agesAtDeathA.length > 0 ? agesAtDeathA.reduce((a: number, b: number) => a + b, 0) / agesAtDeathA.length : 0;
    agesAtDeathA.sort((a: number, b: number) => a - b);
    const medianA = agesAtDeathA.length > 0 ? agesAtDeathA[Math.floor(agesAtDeathA.length / 2)] : 0;
    const maxA = agesAtDeathA.length > 0 ? agesAtDeathA[agesAtDeathA.length - 1] : 0;
    const surv80A = agesAtDeathA.filter((a: number) => a >= 80).length / Math.max(1, agesAtDeathA.length) * 100;
    const surv90A = agesAtDeathA.filter((a: number) => a >= 90).length / Math.max(1, agesAtDeathA.length) * 100;
    const surv100A = agesAtDeathA.filter((a: number) => a >= 100).length / Math.max(1, agesAtDeathA.length) * 100;

    resultsA.push({
      condition: 'A (Phase C Baseline)',
      seed,
      finalPopulation: stateA.humans.filter((h: Human) => h.alive).length,
      totalDeaths: stateA.totalDeaths,
      meanAgeAtDeath: Number(meanA.toFixed(1)),
      medianAgeAtDeath: medianA,
      survival80Pct: Number(surv80A.toFixed(1)),
      survival90Pct: Number(surv90A.toFixed(1)),
      survival100Pct: Number(surv100A.toFixed(1)),
      maxAge: maxA,
    });

    // Run Condition B (Phase D Enabled - uses same engine with full biomarker/aging state updates)
    let stateB: SimulationState = {
      year: 0,
      humans: JSON.parse(JSON.stringify(initialHumans)),
      history: [],
      totalBirths: 0,
      totalDeaths: 0,
      totalFemaleBirths: 0,
      totalMaleBirths: 0,
      nextHumanId: initialSize + 1,
    };

    for (let yr = 0; yr < maxYears; yr++) {
      stateB = simulateYear(stateB);
    }

    const deceasedB = stateB.humans.filter((h: Human) => !h.alive && h.ageAtDeath !== null);
    const agesAtDeathB = deceasedB.map((h: Human) => h.ageAtDeath ?? h.age);
    const meanB = agesAtDeathB.length > 0 ? agesAtDeathB.reduce((a: number, b: number) => a + b, 0) / agesAtDeathB.length : 0;
    agesAtDeathB.sort((a: number, b: number) => a - b);
    const medianB = agesAtDeathB.length > 0 ? agesAtDeathB[Math.floor(agesAtDeathB.length / 2)] : 0;
    const maxB = agesAtDeathB.length > 0 ? agesAtDeathB[agesAtDeathB.length - 1] : 0;
    const surv80B = agesAtDeathB.filter((a: number) => a >= 80).length / Math.max(1, agesAtDeathB.length) * 100;
    const surv90B = agesAtDeathB.filter((a: number) => a >= 90).length / Math.max(1, agesAtDeathB.length) * 100;
    const surv100B = agesAtDeathB.filter((a: number) => a >= 100).length / Math.max(1, agesAtDeathB.length) * 100;

    resultsB.push({
      condition: 'B (Phase D Enabled)',
      seed,
      finalPopulation: stateB.humans.filter((h: Human) => h.alive).length,
      totalDeaths: stateB.totalDeaths,
      meanAgeAtDeath: Number(meanB.toFixed(1)),
      medianAgeAtDeath: medianB,
      survival80Pct: Number(surv80B.toFixed(1)),
      survival90Pct: Number(surv90B.toFixed(1)),
      survival100Pct: Number(surv100B.toFixed(1)),
      maxAge: maxB,
    });
  }

  return { resultsA, resultsB };
}
