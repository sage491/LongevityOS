/**
 * @file generator.ts
 * @description Generates the initial population cohort (100 simulated humans) for year 0.
 *
 * Why this file exists:
 * Rather than mixing population setup with the yearly time-step engine,
 * separating generation logic allows us to easily test different starting cohorts
 * (e.g. all young adults, an aging population, or a balanced demographic pyramid).
 */

import { Human, BiologicalSex, AgeDistributionConfig } from './types';
import { SAMPLE_FIRST_NAMES, SAMPLE_LAST_NAMES, DEFAULT_AGE_DISTRIBUTION_CONFIG } from './constants';
import { initializeBiomarkerProfile, computeBiologicalAge as calcBioAge } from './biomarker';

/**
 * Generates a random number between min and max (inclusive).
 */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Clamps a number between a minimum and maximum bound.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Samples a random age from a configurable population distribution model.
 * 
 * MODEL EXPLANATION:
 * Instead of hardcoded demographic percentiles, a continuous demographic survival curve
 * is sampled using inverse transform sampling:
 * P(age) ~ e^(-decayRate * age) up to maxInitialAge.
 * 
 * If custom brackets are specified in the config, it samples from weighted age bins instead.
 * This makes it trivial to adjust parameters or plug in external demographic census tables later.
 */
export function sampleInitialAge(config: AgeDistributionConfig = DEFAULT_AGE_DISTRIBUTION_CONFIG): number {
  const { maxInitialAge, decayRate, brackets } = config;

  // Option A: If discrete demographic brackets are provided
  if (brackets && brackets.length > 0) {
    const totalWeight = brackets.reduce((sum, b) => sum + b.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const b of brackets) {
      if (rand < b.weight) {
        // Sample integer age within [minAge, maxAge] inclusive, preserving individual variation
        const ageSpan = b.maxAge - b.minAge + 1;
        return b.minAge + Math.floor(Math.random() * ageSpan);
      }
      rand -= b.weight;
    }
    const lastBracket = brackets[brackets.length - 1];
    return lastBracket.minAge + Math.floor(Math.random() * (lastBracket.maxAge - lastBracket.minAge + 1));
  }

  // Option B: Continuous exponential demographic survival decay
  // Sample using inverse CDF of truncated exponential distribution
  if (decayRate <= 0.0005) {
    // Virtually flat uniform distribution
    return Math.floor(randomRange(0, maxInitialAge));
  }

  // Inverse CDF for truncated exponential: x = -ln(1 - u * (1 - e^(-lambda * M))) / lambda
  const u = Math.random();
  const maxFactor = 1 - Math.exp(-decayRate * maxInitialAge);
  const sampledAge = -Math.log(1 - u * maxFactor) / decayRate;

  return Math.floor(clamp(sampledAge, 0, maxInitialAge));
}

/**
 * Computes biological age for an individual.
 * 
 * DESIGN ARCHITECTURE:
 * Biological age and mortality risk are strictly decoupled. Biological age represents
 * physiological maturity and biomarker vitality, while mortality is evaluated through
 * an independent Gompertz actuarial hazard and health multiplier system.
 * 
 * Pediatric & Developmental Phase (Ages 0–17):
 * - Normal developmental stages: children naturally have developing muscle tone and mobility,
 *   which are calibrated to pediatric norms rather than adult athlete benchmarks.
 * - Newborns begin with biological age ~0 (e.g. 0.0 to 0.3) preserving slight constitutional variation.
 * - Childhood biological age tracks developmental maturation smoothly toward adulthood.
 * 
 * Adult Phase (Ages 18+):
 * - Adulthood benchmark reflects peak vital capacities in young adulthood (18-28)
 *   and gradual, realistic senescence.
 * - Divergence allows high health/fitness to produce younger biological age and chronic
 *   physiological wear to produce accelerated biological aging.
 */
function calculateBiologicalAge(
  age: number,
  health: number,
  strength: number,
  cardio: number,
  mobility: number
): number {
  const compositeFitness = (health * 0.4) + (strength * 0.2) + (cardio * 0.2) + (mobility * 0.2);

  // Phase 1: Pediatric & Developmental Maturation (Ages 0 to 17)
  if (age < 18) {
    // Developmental benchmark: normal infant fitness (~40) matures progressively to young adult capacity (~88)
    const developmentalExpectedFitness = 40 + (age / 18) * 48;
    const fitnessDelta = developmentalExpectedFitness - compositeFitness;

    // Scaling factor starts minimal at birth (0.05) so newborn constitutional variance is subtle (~±0.2y)
    // and naturally expands toward adulthood (0.25 at age 18)
    const developmentalSensitivity = 0.05 + (age / 18) * 0.20;
    const biologicalAge = Math.max(0, age + (fitnessDelta * developmentalSensitivity));
    return Number(biologicalAge.toFixed(1));
  }

  // Phase 2: Adult Physiological Senescence (Ages 18+)
  // Benchmark reaches peak capacity in early adulthood (18–28) and undergoes gentle, natural decline
  const expectedAdultFitness = age <= 28
    ? 88
    : clamp(88 - ((age - 28) * 0.65), 20, 88);
  const fitnessDelta = expectedAdultFitness - compositeFitness;

  // High physical reserve preserves youthful biological age; chronic wear advances it
  const biologicalAge = Math.max(0, age + (fitnessDelta * 0.25));
  return Number(biologicalAge.toFixed(1));
}

/**
 * Generates a single human profile based on a target age.
 * Physical attributes peak in early adulthood (age 20-28) and naturally diminish.
 */
export function generateHuman(idNumber: number, targetAge?: number, currentYear: number = 0): Human {
  const sex: BiologicalSex = Math.random() > 0.5 ? 'female' : 'male';
  
  // If target age is not provided, generate a realistic age distribution (0 to 75)
  const age = targetAge !== undefined 
    ? targetAge 
    : Math.floor(randomRange(1, 75));

  const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
  const lastName = SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)];
  const id = `HUM-${idNumber.toString().padStart(4, '0')}`;

  // Prototype attribute modeling based on age curve + individual variance:
  // - Youth (0-19): Growing, building peak strength and cardio
  // - Prime (20-35): Peak capacities (80-98)
  // - Middle (36-60): Gradual natural decline
  // - Elder (60+): Noticeable decline in mobility and strength
  let baseFitnessMultiplier = 1.0;
  if (age < 20) {
    baseFitnessMultiplier = 0.6 + (age / 20) * 0.35; // 0.6 to 0.95
  } else if (age <= 35) {
    baseFitnessMultiplier = 0.9 + Math.random() * 0.1; // 0.9 to 1.0
  } else {
    baseFitnessMultiplier = Math.max(0.2, 1.0 - ((age - 35) * 0.015)); // gradual drop
  }

  // Add individual genetic / lifestyle variance (±12 points)
  const healthVariance = randomRange(-8, 8);
  const strengthVariance = randomRange(-10, 10);
  const cardioVariance = randomRange(-10, 10);
  const mobilityVariance = randomRange(-10, 10);

  const health = Number(clamp((baseFitnessMultiplier * 88) + healthVariance, 15, 100).toFixed(1));
  const strength = Number(clamp((baseFitnessMultiplier * 85) + strengthVariance, 10, 100).toFixed(1));
  const cardiovascularFitness = Number(clamp((baseFitnessMultiplier * 90) + cardioVariance, 10, 100).toFixed(1));
  const mobility = Number(clamp((baseFitnessMultiplier * 85) + mobilityVariance, 10, 100).toFixed(1));

  // Individual biological aging rate trait (0.75 = slow-aging/robust constitution, 1.25 = faster aging)
  const agingRate = Number(randomRange(0.75, 1.25).toFixed(2));

  const biomarkers = initializeBiomarkerProfile(age);
  const bioAgeFromBiomarkers = calcBioAge(age, biomarkers);
  const finalBioAge = Number(bioAgeFromBiomarkers.toFixed(1));

  const agingState = {
    biologicalAge: finalBioAge,
    agingVelocity: 1.0,
    biomarkerHistory: [{
      year: currentYear,
      chronologicalAge: age,
      biologicalAge: finalBioAge,
      agingVelocity: 1.0,
      health,
      biomarkers: { ...biomarkers },
      activeDiseaseCount: 0,
    }]
  };

  const inheritedCardiovascularRisk = Number(randomRange(0.8, 1.2).toFixed(2));
  const inheritedMetabolicRisk = Number(randomRange(0.8, 1.2).toFixed(2));
  const inheritedRespiratoryRisk = Number(randomRange(0.8, 1.2).toFixed(2));
  const inheritedCancerRisk = Number(randomRange(0.8, 1.2).toFixed(2));
  const inheritedInfectiousRisk = Number(randomRange(0.8, 1.2).toFixed(2));

  return {
    id,
    name: `${firstName} ${lastName}`,
    age,
    sex,
    health,
    strength,
    cardiovascularFitness,
    mobility,
    biologicalAge: finalBioAge,
    maxBiologicalAgeReached: finalBioAge,
    agingRate,
    alive: true,
    birthYear: currentYear - age,
    deathYear: null,
    ageAtDeath: null,
    diseases: [],
    biomarkers,
    agingState,
    inheritedCardiovascularRisk,
    inheritedMetabolicRisk,
    inheritedRespiratoryRisk,
    inheritedCancerRisk,
    inheritedInfectiousRisk,
  };
}

/**
 * Generates an initial cohort of simulated humans with configurable age distribution.
 * 
 * @param count Number of agents to generate (e.g. 1000)
 * @param currentYear Starting simulation calendar year (default 0)
 * @param ageConfig Configurable age distribution parameters (default: DEFAULT_AGE_DISTRIBUTION_CONFIG)
 */
export function generateInitialPopulation(
  count: number = 1000,
  currentYear: number = 0,
  ageConfig: AgeDistributionConfig = DEFAULT_AGE_DISTRIBUTION_CONFIG
): Human[] {
  const population: Human[] = [];

  for (let i = 1; i <= count; i++) {
    // Sample age from the configurable distribution model
    const targetAge = sampleInitialAge(ageConfig);
    population.push(generateHuman(i, targetAge, currentYear));
  }

  return population;
}

