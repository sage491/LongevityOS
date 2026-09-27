/**
 * @file engine.ts
 * @description The annual simulation step engine for Immortal Theory.
 * Calibrated against the India Demographic & Mortality Baseline (ORGI SRS Life Tables).
 * 
 * DISCLAIMER:
 * All biological equations and biomarker curves implemented here are
 * COMPUTATIONAL CALIBRATION MODELS for demographic and longevity simulations,
 * not clinical medical diagnostic tools.
 */

import {
  Human,
  PopulationStatistics,
  LongevityStatistics,
  SimulationConfig,
  BiologicalSex,
  MultiPhaseMortalityConfig,
  MortalityCalibrationReport,
  CauseOfDeathStatistics,
} from './types';
import {
  DEFAULT_CONFIG,
  INDIA_2024_MORTALITY_CONFIG,
  INDIA_ASFR_SCHEDULE,
  CAUSE_CATEGORIES,
  determineCauseOfDeath,
  SAMPLE_FIRST_NAMES,
  SAMPLE_LAST_NAMES,
} from './constants';
import { clamp, randomRange } from './generator';
import { processAnnualDiseases } from './disease';
import {
  initializeBiomarkerProfile,
  updateBiomarkersAnnually,
  computeBiologicalAge as calcBioAge,
  calculateAgingVelocity,
} from './biomarker';

export interface SimulationState {
  year: number;
  humans: Human[];
  history: PopulationStatistics[];
  totalBirths: number;
  totalDeaths: number;
  totalFemaleBirths: number;
  totalMaleBirths: number;
  nextHumanId: number;
}

/**
 * Calculates the empirical baseline annual mortality hazard for an agent's chronological age
 * based on the Indian SRS Abridged Life Table multi-phase calibration.
 *
 * @param age Chronological age of the individual during the annual step
 * @param config Multi-phase mortality configuration parameters
 * @returns Baseline annual mortality probability / hazard
 */
export function calculateBaselineAgeMortality(age: number, config: MultiPhaseMortalityConfig): number {
  // Phase 1: Infant Mortality (Age 0 -> 1)
  // Dedicated empirical mechanism separate from adult Gompertz senescence
  if (age === 0) {
    return config.infantMortalityHazard;
  }

  // Phase 2a: Early Childhood (Ages 1–4)
  if (age >= 1 && age <= 4) {
    return config.earlyChildhoodAnnualHazard;
  }

  // Phase 2b: Older Childhood (Ages 5–14)
  if (age >= 5 && age <= 14) {
    return config.childAnnualHazard;
  }

  // Phase 3: Adolescent & Young Adult (Ages 15–24)
  if (age >= 15 && age <= 24) {
    return config.youngAdultAnnualHazard;
  }

  // Phase 4: Adult Senescence (Ages 25–84)
  // Matches empirical 5-year interval mortality rates from Indian SRS Abridged Life Tables
  if (config.adultIntervalRates && config.adultIntervalRates.length > 0) {
    for (const interval of config.adultIntervalRates) {
      if (age >= interval.minAge && age <= interval.maxAge) {
        const seniorFactor = (age >= 65 && age <= 84 && config.seniorHazardMultiplier)
          ? config.seniorHazardMultiplier
          : 1.0;
        return interval.annualQ * seniorFactor;
      }
    }
  }

  // Phase 5: Oldest-Old Senescence (Ages 85+, open-ended)
  // No artificial maximum lifespan cap. Hazard continues accelerating exponentially.
  const q80_84 = config.adultIntervalRates?.[config.adultIntervalRates.length - 1]?.annualQ || 0.14777;
  const excessYears = Math.max(0, age - 84);
  return Math.min(0.88, q80_84 * Math.exp(config.oldestOldSlope * excessYears));
}

/**
 * Compiles a comprehensive mortality calibration report comparing observed cohort statistics
 * against the official Indian SRS benchmarks.
 */
export function calculateMortalityCalibrationReport(
  humans: Human[],
  totalBirths?: number
): MortalityCalibrationReport {
  const deceased = humans.filter(h => !h.alive);
  const totalLivingAndDead = humans.length;

  // 1. Infant Mortality Rate (Age 0)
  const infantDeaths = deceased.filter(d => (d.ageAtDeath != null ? d.ageAtDeath : d.age) === 0).length;
  const infantDenominator = totalBirths && totalBirths > 0
    ? totalBirths
    : Math.max(infantDeaths, humans.filter(h => h.birthYear !== undefined).length || totalLivingAndDead);
  const observedIMR = infantDenominator > 0 ? Number(((infantDeaths / infantDenominator) * 1000).toFixed(1)) : 0;

  // Helper for age interval cumulative mortality rate per 1,000 reaching minAge
  const getIntervalMortality = (minAge: number, maxAge: number) => {
    const deathsInInterval = deceased.filter(d => {
      const a = d.ageAtDeath != null ? d.ageAtDeath : d.age;
      return a >= minAge && a <= maxAge;
    }).length;
    const reachedMinAge = humans.filter(h => {
      const a = h.alive ? h.age : (h.ageAtDeath != null ? h.ageAtDeath : h.age);
      return a >= minAge;
    }).length;
    return reachedMinAge > 0 ? Number(((deathsInInterval / reachedMinAge) * 1000).toFixed(1)) : 0;
  };

  const observed1_4 = getIntervalMortality(1, 4);
  const observed5_14 = getIntervalMortality(5, 14);
  const observed15_24 = getIntervalMortality(15, 24);
  const observed25_44 = getIntervalMortality(25, 44);
  const observed45_64 = getIntervalMortality(45, 64);
  const observed65_74 = getIntervalMortality(65, 74);
  const observed75_84 = getIntervalMortality(75, 84);
  const deaths85Plus = deceased.filter(d => (d.ageAtDeath != null ? d.ageAtDeath : d.age) >= 85).length;

  // Sex differentials
  const maleDeceased = deceased.filter(d => d.sex === 'male');
  const femaleDeceased = deceased.filter(d => d.sex === 'female');
  const maleSumLifespan = maleDeceased.reduce((s, d) => s + (d.ageAtDeath != null ? d.ageAtDeath : d.age), 0);
  const femaleSumLifespan = femaleDeceased.reduce((s, d) => s + (d.ageAtDeath != null ? d.ageAtDeath : d.age), 0);
  const maleAvg = maleDeceased.length > 0 ? Number((maleSumLifespan / maleDeceased.length).toFixed(1)) : 0;
  const femaleAvg = femaleDeceased.length > 0 ? Number((femaleSumLifespan / femaleDeceased.length).toFixed(1)) : 0;

  const allLifespans: number[] = deceased.map(d => (d.ageAtDeath != null ? d.ageAtDeath : d.age)).sort((a, b) => a - b);
  const overallAvg = deceased.length > 0 ? Number((allLifespans.reduce((s, a) => s + a, 0) / deceased.length).toFixed(1)) : 0;

  let medianAge = 0;
  if (allLifespans.length > 0) {
    const mid = Math.floor(allLifespans.length / 2);
    const midVal = allLifespans[mid] ?? 0;
    const prevVal = allLifespans[mid - 1] ?? 0;
    medianAge = allLifespans.length % 2 === 0
      ? Number(((prevVal + midVal) / 2).toFixed(1))
      : midVal;
  }

  let maxAge = 0;
  for (const h of humans) {
    const a = h.alive ? h.age : (h.ageAtDeath != null ? h.ageAtDeath : h.age);
    if (a > maxAge) maxAge = a;
  }

  // Milestone reachers
  let reached80 = 0;
  let reached90 = 0;
  let reached100 = 0;
  for (const h of humans) {
    const a = h.alive ? h.age : (h.ageAtDeath != null ? h.ageAtDeath : h.age);
    if (a >= 80) reached80++;
    if (a >= 90) reached90++;
    if (a >= 100) reached100++;
  }

  const denominator = Math.max(1, totalLivingAndDead);
  const pct80 = Number(((reached80 / denominator) * 100).toFixed(1));
  const pct90 = Number(((reached90 / denominator) * 100).toFixed(1));
  const pct100 = Number(((reached100 / denominator) * 100).toFixed(1));

  return {
    imr: { observed: observedIMR, target: 24.0, unit: 'per 1k live births', description: 'Infant Mortality Rate (Age 0-1)' },
    age1_4: { observed: observed1_4, target: 7.8, unit: 'per 1k in interval', description: 'Early Childhood Mortality (Ages 1-4)' },
    age5_14: { observed: observed5_14, target: 2.8, unit: 'per 1k in interval', description: 'Older Child Mortality (Ages 5-14)' },
    age15_24: { observed: observed15_24, target: 6.4, unit: 'per 1k in interval', description: 'Adolescent & Youth Mortality (Ages 15-24)' },
    age25_44: { observed: observed25_44, target: 49.1, unit: 'per 1k in interval', description: 'Young Adult Senescence (Ages 25-44)' },
    age45_64: { observed: observed45_64, target: 237.2, unit: 'per 1k in interval', description: 'Middle Age Senescence (Ages 45-64)' },
    age65_74: { observed: observed65_74, target: 395.7, unit: 'per 1k in interval', description: 'Senior Senescence (Ages 65-74)' },
    age75_84: { observed: observed75_84, target: 726.5, unit: 'per 1k in interval', description: 'Late Senior Senescence (Ages 75-84)' },
    age85PlusDeaths: { observedCount: deaths85Plus, targetDescription: 'Open-ended stochastic senescence' },
    maleLifeExpectancy: { observed: maleAvg, target: 68.6, unit: 'years' },
    femaleLifeExpectancy: { observed: femaleAvg, target: 72.1, unit: 'years' },
    overallLifeExpectancy: { observed: overallAvg, target: 70.3, unit: 'years' },
    medianAgeAtDeath: { observed: medianAge, target: 73.5, unit: 'years' },
    maxObservedAge: { observed: maxAge, target: 'Open-ended (100-108+)', unit: 'years' },
    survivedTo80: { observedCount: reached80, observedPct: pct80, targetPct: 33.0 },
    survivedTo90: { observedCount: reached90, observedPct: pct90, targetPct: 8.5 },
    survivedTo100: { observedCount: reached100, observedPct: pct100, targetPct: 0.5 },
  };
}

/**
 * Calculates current population statistics from the human registry for an individual year.
 */
export function calculatePopulationStats(
  humans: Human[],
  currentYear: number,
  birthsInYear: number,
  deathsInYear: number,
  femaleBirthsInYear: number = 0,
  maleBirthsInYear: number = 0
): PopulationStatistics {
  const living = humans.filter(h => h.alive);
  const livingCount = living.length;

  const crudeBirthRate = livingCount > 0 ? Number(((birthsInYear / livingCount) * 1000).toFixed(1)) : 0;
  const crudeDeathRate = livingCount > 0 ? Number(((deathsInYear / livingCount) * 1000).toFixed(1)) : 0;
  const observedSexRatioAtBirth = maleBirthsInYear > 0
    ? Number(((femaleBirthsInYear / maleBirthsInYear) * 1000).toFixed(1))
    : (femaleBirthsInYear > 0 ? 1000 : 0);

  if (livingCount === 0) {
    return {
      year: currentYear,
      totalPopulation: 0,
      femaleCount: 0,
      maleCount: 0,
      averageAge: 0,
      averageBiologicalAge: 0,
      biologicalAgeGap: 0,
      averageHealth: 0,
      averageStrength: 0,
      averageCardio: 0,
      averageMobility: 0,
      births: birthsInYear,
      femaleBirths: femaleBirthsInYear,
      maleBirths: maleBirthsInYear,
      crudeBirthRate,
      observedSexRatioAtBirth,
      deaths: deathsInYear,
      crudeDeathRate,
      maxAge: 0,
    };
  }

  let sumAge = 0;
  let sumBioAge = 0;
  let sumHealth = 0;
  let sumStrength = 0;
  let sumCardio = 0;
  let sumMobility = 0;
  let femaleCount = 0;
  let maxAge = 0;

  for (const h of living) {
    sumAge += h.age;
    sumBioAge += h.biologicalAge;
    sumHealth += h.health;
    sumStrength += h.strength;
    sumCardio += h.cardiovascularFitness;
    sumMobility += h.mobility;
    if (h.sex === 'female') femaleCount++;
    if (h.age > maxAge) maxAge = h.age;
  }

  const avgAge = Number((sumAge / livingCount).toFixed(1));
  const avgBioAge = Number((sumBioAge / livingCount).toFixed(1));

  return {
    year: currentYear,
    totalPopulation: livingCount,
    femaleCount,
    maleCount: livingCount - femaleCount,
    averageAge: avgAge,
    averageBiologicalAge: avgBioAge,
    biologicalAgeGap: Number((avgBioAge - avgAge).toFixed(1)),
    averageHealth: Number((sumHealth / livingCount).toFixed(1)),
    averageStrength: Number((sumStrength / livingCount).toFixed(1)),
    averageCardio: Number((sumCardio / livingCount).toFixed(1)),
    averageMobility: Number((sumMobility / livingCount).toFixed(1)),
    births: birthsInYear,
    femaleBirths: femaleBirthsInYear,
    maleBirths: maleBirthsInYear,
    crudeBirthRate,
    observedSexRatioAtBirth,
    deaths: deathsInYear,
    crudeDeathRate,
    maxAge,
  };
}

/**
 * Calculates longevity and actuarial statistics from the entire human history.
 */
export function calculateLongevityStats(humans: Human[], totalBirths?: number): LongevityStatistics {
  const deceased = humans.filter(h => !h.alive);
  const totalDeceasedCount = deceased.length;

  const deathsByAgeRange: Record<string, number> = {
    '0-19': 0,
    '20-39': 0,
    '40-59': 0,
    '60-69': 0,
    '70-74': 0,
    '75-79': 0,
    '80-84': 0,
    '85-89': 0,
    '90-94': 0,
    '95-99': 0,
    '100+': 0,
  };

  let sumLifespan = 0;
  let maxLifespan = 0;
  const lifespans: number[] = [];
  const maleLifespans: number[] = [];
  const femaleLifespans: number[] = [];

  for (const d of deceased) {
    const ageAtDeath = d.ageAtDeath !== undefined && d.ageAtDeath !== null ? d.ageAtDeath : d.age;
    sumLifespan += ageAtDeath;
    lifespans.push(ageAtDeath);
    if (ageAtDeath > maxLifespan) {
      maxLifespan = ageAtDeath;
    }

    if (d.sex === 'male') {
      maleLifespans.push(ageAtDeath);
    } else {
      femaleLifespans.push(ageAtDeath);
    }

    if (ageAtDeath < 20) deathsByAgeRange['0-19']++;
    else if (ageAtDeath < 40) deathsByAgeRange['20-39']++;
    else if (ageAtDeath < 60) deathsByAgeRange['40-59']++;
    else if (ageAtDeath < 70) deathsByAgeRange['60-69']++;
    else if (ageAtDeath < 75) deathsByAgeRange['70-74']++;
    else if (ageAtDeath < 80) deathsByAgeRange['75-79']++;
    else if (ageAtDeath < 85) deathsByAgeRange['80-84']++;
    else if (ageAtDeath < 90) deathsByAgeRange['85-89']++;
    else if (ageAtDeath < 95) deathsByAgeRange['90-94']++;
    else if (ageAtDeath < 100) deathsByAgeRange['95-99']++;
    else deathsByAgeRange['100+']++;
  }

  // Median lifespan helper
  const calcMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    arr.sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 === 0
      ? Number(((arr[mid - 1] + arr[mid]) / 2).toFixed(1))
      : arr[mid];
  };

  const medianLifespan = calcMedian(lifespans);
  const maleMedianLifespan = calcMedian(maleLifespans);
  const femaleMedianLifespan = calcMedian(femaleLifespans);

  const maleDeceasedCount = maleLifespans.length;
  const femaleDeceasedCount = femaleLifespans.length;
  const maleSumLifespan = maleLifespans.reduce((s, a) => s + a, 0);
  const femaleSumLifespan = femaleLifespans.reduce((s, a) => s + a, 0);
  const maleAverageLifespan = maleDeceasedCount > 0 ? Number((maleSumLifespan / maleDeceasedCount).toFixed(1)) : 0;
  const femaleAverageLifespan = femaleDeceasedCount > 0 ? Number((femaleSumLifespan / femaleDeceasedCount).toFixed(1)) : 0;

  // Count milestone reachers across all humans ever in the simulation (living or deceased)
  let reachedAge70 = 0;
  let reachedAge80 = 0;
  let reachedAge85 = 0;
  let reachedAge90 = 0;
  let reachedAge100Plus = 0;

  for (const h of humans) {
    const highestAge = !h.alive
      ? (h.ageAtDeath !== undefined && h.ageAtDeath !== null ? h.ageAtDeath : h.age)
      : h.age;

    if (highestAge >= 70) reachedAge70++;
    if (highestAge >= 80) reachedAge80++;
    if (highestAge >= 85) reachedAge85++;
    if (highestAge >= 90) reachedAge90++;
    if (highestAge >= 100) reachedAge100Plus++;
  }

  const mortalityReport = calculateMortalityCalibrationReport(humans, totalBirths);

  return {
    totalDeceasedCount,
    averageLifespan: totalDeceasedCount > 0 ? Number((sumLifespan / totalDeceasedCount).toFixed(1)) : 0,
    medianLifespan,
    maxLifespan,
    maleDeceasedCount,
    femaleDeceasedCount,
    maleAverageLifespan,
    femaleAverageLifespan,
    maleMedianLifespan,
    femaleMedianLifespan,
    reachedAge70,
    reachedAge80,
    reachedAge85,
    reachedAge90,
    reachedAge100Plus,
    deathsByAgeRange,
    mortalityReport,
  };
}

/**
 * Executes a single annual simulation step (Year N -> Year N+1).
 * 
 * Annual Step Sequence:
 * 1. Aging & Physiological Decay
 * 2. Multi-Phase Indian Baseline Mortality Evaluation
 * 3. Reproduction & Inheritance
 * 4. Statistics Compilation
 */
export function simulateYear(
  currentState: SimulationState,
  config: SimulationConfig = DEFAULT_CONFIG
): SimulationState {
  const newYear = currentState.year + 1;
  const currentHumans = currentState.humans;
  let deathsInYear = 0;
  let nextId = currentState.nextHumanId ?? (
    currentState.humans.length > 0
      ? Math.max(0, ...currentState.humans.map(h => {
          const parsed = parseInt(h.id.replace('HUM-', ''), 10);
          return isNaN(parsed) ? 0 : parsed;
        })) + 1
      : 1
  );
  const mortalityConfig = config.mortality || INDIA_2024_MORTALITY_CONFIG;

  // STEP 1: Process Disease Onsets, Progression, and Health Burdens (Phase C)
  const { updatedHumans: humansAfterDiseases } = processAnnualDiseases(currentHumans, newYear);

  // STEP 2: Process all currently living humans (Aging, Decay, Mortality)
  const updatedHumans: Human[] = humansAfterDiseases.map(human => {
    // If already dead in a previous year, preserve their historical record untouched
    if (!human.alive) {
      return human;
    }

    // A. Current chronological age at the start of this annual step interval
    const currentAge = human.age;
    const nextAge = currentAge + 1;

    // B. Simplified Prototype Biomarker Dynamics
    // Biomarkers follow prototype assumptions:
    // - Under 20: Growing vitality (slight annual gains)
    // - 20 to 35: Peak maintenance (near stability with slight fluctuations)
    // - Over 35: Gradual prototype decay accelerating with age
    let healthDelta: number;
    let strengthDelta: number;
    let cardioDelta: number;
    let mobilityDelta: number;

    if (currentAge < 20) {
      healthDelta = randomRange(0.5, 2.0);
      strengthDelta = randomRange(1.0, 3.5);
      cardioDelta = randomRange(1.0, 3.0);
      mobilityDelta = randomRange(0.5, 2.0);
    } else if (currentAge <= 35) {
      healthDelta = randomRange(-0.5, 0.3);
      strengthDelta = randomRange(-0.6, 0.4);
      cardioDelta = randomRange(-0.6, 0.4);
      mobilityDelta = randomRange(-0.5, 0.3);
    } else {
      // Over age 35: Individual wear modulated by the agent's unique biological aging rate
      const individualAgingFactor = human.agingRate || 1.0;
      const ageProgression = 1.0 + Math.max(0, (currentAge - 35) * 0.012);
      const annualWear = randomRange(0.4, 1.1) * individualAgingFactor * ageProgression;

      healthDelta = -annualWear;
      strengthDelta = -annualWear * 1.1;
      cardioDelta = -annualWear * 1.0;
      mobilityDelta = -annualWear * 1.2;
    }

    // Apply clamped updates
    const newHealth = Number(clamp(human.health + healthDelta, 0, 100).toFixed(1));
    const newStrength = Number(clamp(human.strength + strengthDelta, 0, 100).toFixed(1));
    const newCardio = Number(clamp(human.cardiovascularFitness + cardioDelta, 0, 100).toFixed(1));
    const newMobility = Number(clamp(human.mobility + mobilityDelta, 0, 100).toFixed(1));

    // Phase D: Update 7 foundational biomarker domains & biological aging state
    const existingBiomarkers = human.biomarkers || initializeBiomarkerProfile(currentAge);
    const newBiomarkers = updateBiomarkersAnnually(nextAge, existingBiomarkers, human.diseases || [], newHealth);
    const newBioAge = Number(calcBioAge(nextAge, newBiomarkers).toFixed(1));
    const prevBioAge = human.agingState?.biologicalAge ?? human.biologicalAge;
    const prevVelocity = human.agingState?.agingVelocity ?? 1.0;
    const newVelocity = Number(calculateAgingVelocity(newBioAge, prevBioAge, prevVelocity).toFixed(2));

    const updatedHistory = [
      ...(human.agingState?.biomarkerHistory || []),
      {
        year: newYear,
        chronologicalAge: nextAge,
        biologicalAge: newBioAge,
        agingVelocity: newVelocity,
        health: newHealth,
        biomarkers: { ...newBiomarkers },
        activeDiseaseCount: (human.diseases || []).filter(d => d.active).length,
      }
    ];

    const newAgingState = {
      biologicalAge: newBioAge,
      agingVelocity: newVelocity,
      biomarkerHistory: updatedHistory,
    };
    const updatedMaxBioAge = Math.max(human.maxBiologicalAgeReached || human.biologicalAge, newBioAge);

    // D. Multi-Phase Indian Baseline Mortality Evaluation
    // 1. Chronological Age determines empirical baseline hazard (SRS life table calibration)
    const baseAgeHazard = calculateBaselineAgeMortality(currentAge, mortalityConfig);

    // 2. Sex-specific hazard modifier (emergent ~3.5 year female survival advantage)
    const sexMultiplier = human.sex === 'male'
      ? mortalityConfig.maleHazardMultiplier
      : mortalityConfig.femaleHazardMultiplier;

    // 3. Health Biomarker Modulation around the chronological baseline
    // Chronological age determines baseline; health modifies individual risk around baseline
    // Expected health naturally trails from ~95 at birth down to ~40 at age 80
    const expectedHealth = Math.max(25, 95 - currentAge * 0.70);
    const healthRatio = newHealth / expectedHealth;
    // When health is above expected, healthRatio > 1 => modifier < 1.0 (resilience buffer)
    // When health is below expected, healthRatio < 1 => modifier > 1.0 (vulnerability increase)
    const healthModifier = 1 + mortalityConfig.healthMortalitySensitivity * (1 - healthRatio);

    // 4. Critical Frailty Increment (smooth elevation below critical threshold, avoiding abrupt executioner)
    const frailtyHazard = newHealth < mortalityConfig.criticalHealthThreshold
      ? (mortalityConfig.criticalHealthThreshold - newHealth) * 0.025
      : 0;

    // 5. Final annual mortality probability clamped with smooth stochastic upper bound
    const annualMortalityProbability = clamp(
      (baseAgeHazard * sexMultiplier * Math.max(0.35, healthModifier)) + frailtyHazard,
      0.0001,
      0.92
    );

    let isDead = false;
    let causeOfDeath: string | undefined = undefined;

    if (Math.random() < annualMortalityProbability) {
      isDead = true;
      causeOfDeath = determineCauseOfDeath(currentAge, human.sex, newHealth);
    }

    if (isDead) {
      deathsInYear++;
      return {
        ...human,
        age: currentAge,
        health: newHealth,
        strength: newStrength,
        cardiovascularFitness: newCardio,
        mobility: newMobility,
        biologicalAge: newBioAge,
        maxBiologicalAgeReached: updatedMaxBioAge,
        biomarkers: newBiomarkers,
        agingState: newAgingState,
        alive: false,
        deathYear: newYear,
        ageAtDeath: currentAge,
        causeOfDeath,
      };
    }

    return {
      ...human,
      age: nextAge,
      health: newHealth,
      strength: newStrength,
      cardiovascularFitness: newCardio,
      mobility: newMobility,
      biologicalAge: newBioAge,
      maxBiologicalAgeReached: updatedMaxBioAge,
      biomarkers: newBiomarkers,
      agingState: newAgingState,
    };
  });

  // STEP 3: Reproduction & Inheritance (India ASFR Schedule, Ages 15–49)
  const minRepAge = config.minReproductionAge ?? 15;
  const maxRepAge = config.maxReproductionAge ?? 49;
  const livingAdultFemales = updatedHumans.filter(
    h => h.alive && h.sex === 'female' && h.age >= minRepAge && h.age <= maxRepAge
  );

  const livingAdultMales = updatedHumans.filter(
    h => h.alive && h.sex === 'male' && h.age >= minRepAge && h.age <= 65
  );

  const newBabies: Human[] = [];
  let femaleBirthsInYear = 0;
  let maleBirthsInYear = 0;

  // Each eligible female has a chance of giving birth if adult males exist
  if (livingAdultMales.length > 0) {
    // Calibrated Sex Ratio at Birth (SRB): Target 908 females per 1,000 males (SRS 2024)
    const femaleProb = config.femaleBirthProbability ?? (
      config.targetSexRatioAtBirth
        ? config.targetSexRatioAtBirth / (config.targetSexRatioAtBirth + 1000)
        : 908 / (908 + 1000)
    );
    const fertilityMult = config.fertilityMultiplier ?? 1.0;
    const schedule = config.asfrSchedule || INDIA_ASFR_SCHEDULE;

    for (const mother of livingAdultFemales) {
      let ageBaseProb = 0.01;
      for (const bracket of schedule) {
        if (mother.age >= bracket.minAge && mother.age <= bracket.maxAge) {
          ageBaseProb = bracket.annualProbability;
          break;
        }
      }

      // Health influences fertility slightly: healthy mothers have expected birth chance
      const fertilityHealthFactor = mother.health / 100;
      const birthChance = ageBaseProb * fertilityMult * fertilityHealthFactor;

      if (Math.random() < birthChance) {
        // Pick a father randomly from living adult males
        const father = livingAdultMales[Math.floor(Math.random() * livingAdultMales.length)];

        // Stochastic newborn sex assignment calibrated to Indian SRB
        const isFemale = Math.random() < femaleProb;
        const babySex: BiologicalSex = isFemale ? 'female' : 'male';
        if (isFemale) {
          femaleBirthsInYear++;
        } else {
          maleBirthsInYear++;
        }

        const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
        // Inherit father's last name or mother's
        const lastName = father.name.split(' ')[1] || mother.name.split(' ')[1] || 'Solari';

        // Newborn infant attributes (calibrated for age 0):
        const parentalHealthAvg = (mother.health + father.health) / 2;
        const parentalStrengthAvg = (mother.strength + father.strength) / 2;
        const parentalCardioAvg = (mother.cardiovascularFitness + father.cardiovascularFitness) / 2;
        const parentalMobilityAvg = (mother.mobility + father.mobility) / 2;

        const infantHealth = Number(clamp(parentalHealthAvg * 0.95 + randomRange(-5, 5), 60, 99).toFixed(1));
        const infantStrength = Number(clamp((parentalStrengthAvg * 0.4) + randomRange(15, 25), 15, 50).toFixed(1));
        const infantCardio = Number(clamp((parentalCardioAvg * 0.5) + randomRange(20, 30), 20, 60).toFixed(1));
        const infantMobility = Number(clamp((parentalMobilityAvg * 0.4) + randomRange(15, 25), 15, 50).toFixed(1));

        // Inherited constitution: average of parents' aging rates with slight genetic variance
        const parentalAgingRateAvg = ((mother.agingRate || 1.0) + (father.agingRate || 1.0)) / 2;
        const babyAgingRate = Number(clamp(parentalAgingRateAvg + randomRange(-0.06, 0.06), 0.65, 1.35).toFixed(2));

        const inheritRisk = (mRisk?: number, fRisk?: number) => {
          const m = mRisk ?? 1.0;
          const f = fRisk ?? 1.0;
          return Number(clamp(((m + f) / 2) + randomRange(-0.08, 0.08), 0.5, 2.0).toFixed(2));
        };

        const inheritedCardiovascularRisk = inheritRisk(mother.inheritedCardiovascularRisk, father.inheritedCardiovascularRisk);
        const inheritedMetabolicRisk = inheritRisk(mother.inheritedMetabolicRisk, father.inheritedMetabolicRisk);
        const inheritedRespiratoryRisk = inheritRisk(mother.inheritedRespiratoryRisk, father.inheritedRespiratoryRisk);
        const inheritedCancerRisk = inheritRisk(mother.inheritedCancerRisk, father.inheritedCancerRisk);
        const inheritedInfectiousRisk = inheritRisk(mother.inheritedInfectiousRisk, father.inheritedInfectiousRisk);

        const babyBiomarkers = initializeBiomarkerProfile(0);
        const babyBioAge = Number(calcBioAge(0, babyBiomarkers).toFixed(1));
        const babyAgingState = {
          biologicalAge: babyBioAge,
          agingVelocity: 1.0,
          biomarkerHistory: [{
            year: newYear,
            chronologicalAge: 0,
            biologicalAge: babyBioAge,
            agingVelocity: 1.0,
            health: infantHealth,
            biomarkers: { ...babyBiomarkers },
            activeDiseaseCount: 0,
          }]
        };

        const baby: Human = {
          id: `HUM-${nextId.toString().padStart(4, '0')}`,
          name: `${firstName} ${lastName}`,
          age: 0,
          sex: babySex,
          health: infantHealth,
          strength: infantStrength,
          cardiovascularFitness: infantCardio,
          mobility: infantMobility,
          biologicalAge: babyBioAge,
          maxBiologicalAgeReached: babyBioAge,
          agingRate: babyAgingRate,
          alive: true,
          birthYear: newYear,
          deathYear: null,
          ageAtDeath: null,
          diseases: [],
          biomarkers: babyBiomarkers,
          agingState: babyAgingState,
          inheritedCardiovascularRisk,
          inheritedMetabolicRisk,
          inheritedRespiratoryRisk,
          inheritedCancerRisk,
          inheritedInfectiousRisk,
        };

        newBabies.push(baby);
        nextId++;
      }
    }
  }

  const allHumansNow = [...updatedHumans, ...newBabies];
  const birthsInYear = newBabies.length;

  // STEP 4: Record Statistics for this year
  const yearStats = calculatePopulationStats(
    allHumansNow,
    newYear,
    birthsInYear,
    deathsInYear,
    femaleBirthsInYear,
    maleBirthsInYear
  );

  return {
    year: newYear,
    humans: allHumansNow,
    history: [...currentState.history, yearStats],
    totalBirths: currentState.totalBirths + birthsInYear,
    totalDeaths: currentState.totalDeaths + deathsInYear,
    totalFemaleBirths: (currentState.totalFemaleBirths ?? 0) + femaleBirthsInYear,
    totalMaleBirths: (currentState.totalMaleBirths ?? 0) + maleBirthsInYear,
    nextHumanId: nextId,
  };
}

/**
 * Calculates comprehensive Cause-of-Death statistics from the population human registry.
 */
export function calculateCauseOfDeathStatistics(humans: Human[]): CauseOfDeathStatistics {
  const deceased = humans.filter(h => !h.alive);
  const totalDeaths = deceased.length;

  const deathsByCause: Record<string, number> = {};
  const causePercentages: Record<string, number> = {};
  const deathsByCauseAndAge: Record<string, Record<string, number>> = {};
  const deathsByCauseAndSex: Record<string, Record<string, number>> = {};
  const ageSumByCause: Record<string, number> = {};
  const countByCause: Record<string, number> = {};

  for (const c of CAUSE_CATEGORIES) {
    deathsByCause[c] = 0;
    deathsByCauseAndAge[c] = { '0': 0, '1-4': 0, '5-14': 0, '15-24': 0, '25-44': 0, '45-64': 0, '65-74': 0, '75-84': 0, '85+': 0 };
    deathsByCauseAndSex[c] = { 'female': 0, 'male': 0 };
    ageSumByCause[c] = 0;
    countByCause[c] = 0;
  }

  for (const d of deceased) {
    const cause = d.causeOfDeath || 'Other causes';
    const a = d.ageAtDeath !== null && d.ageAtDeath !== undefined ? d.ageAtDeath : d.age;
    const sex = d.sex;

    deathsByCause[cause] = (deathsByCause[cause] || 0) + 1;
    ageSumByCause[cause] = (ageSumByCause[cause] || 0) + a;
    countByCause[cause] = (countByCause[cause] || 0) + 1;

    let ageBracket = '85+';
    if (a === 0) ageBracket = '0';
    else if (a >= 1 && a <= 4) ageBracket = '1-4';
    else if (a >= 5 && a <= 14) ageBracket = '5-14';
    else if (a >= 15 && a <= 24) ageBracket = '15-24';
    else if (a >= 25 && a <= 44) ageBracket = '25-44';
    else if (a >= 45 && a <= 64) ageBracket = '45-64';
    else if (a >= 65 && a <= 74) ageBracket = '65-74';
    else if (a >= 75 && a <= 84) ageBracket = '75-84';

    if (!deathsByCauseAndAge[cause]) deathsByCauseAndAge[cause] = {};
    deathsByCauseAndAge[cause][ageBracket] = (deathsByCauseAndAge[cause][ageBracket] || 0) + 1;

    if (!deathsByCauseAndSex[cause]) deathsByCauseAndSex[cause] = { 'female': 0, 'male': 0 };
    deathsByCauseAndSex[cause][sex] = (deathsByCauseAndSex[cause][sex] || 0) + 1;
  }

  for (const c of Object.keys(deathsByCause)) {
    causePercentages[c] = totalDeaths > 0 ? Number(((deathsByCause[c] / totalDeaths) * 100).toFixed(1)) : 0;
  }

  const averageAgeAtDeathByCause: Record<string, number> = {};
  for (const c of Object.keys(deathsByCause)) {
    const cnt = countByCause[c] || 0;
    averageAgeAtDeathByCause[c] = cnt > 0 ? Number((ageSumByCause[c] / cnt).toFixed(1)) : 0;
  }

  return {
    totalDeaths,
    deathsByCause,
    causePercentages,
    deathsByCauseAndAge,
    deathsByCauseAndSex,
    averageAgeAtDeathByCause,
  };
}
