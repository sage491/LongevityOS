/**
 * @file constants.ts
 * @description Baseline parameters, default configuration, and names for prototype generation.
 *
 * Why this file exists:
 * Hardcoding "magic numbers" (like 100, 18, 0.05) directly in equations makes code
 * hard to maintain and calibrate. Constants centralize all scientific and operational
 * defaults into one clear location.
 */

import { SimulationConfig, AgeDistributionConfig, MultiPhaseMortalityConfig, MortalityIntervalRate, ASFRIgdRate, BiologicalSex } from './types';

/**
 * Official Indian Demographic Age Structure (ORGI Sample Registration System / SRS Statistical Report Statement 3).
 * Target Initial Age Distribution:
 * - Age 0–14: 25.3%
 * - Age 15–24: 17.6%
 * - Age 25–44: 30.8%
 * - Age 45–64: 19.2%
 * - Age 65+: 7.1% (distributed across senior ages up to 85)
 */
export const INDIA_2024_AGE_DISTRIBUTION_CONFIG: AgeDistributionConfig = {
  maxInitialAge: 85,
  decayRate: 0.022,
  brackets: [
    { minAge: 0, maxAge: 14, weight: 25.3 },
    { minAge: 15, maxAge: 24, weight: 17.6 },
    { minAge: 25, maxAge: 44, weight: 30.8 },
    { minAge: 45, maxAge: 64, weight: 19.2 },
    { minAge: 65, maxAge: 85, weight: 7.1 },
  ],
};

/**
 * Default parameters for the initial mixed-age population distribution model.
 * Researchers can configure how a mixed-age civilization is initialized (defaults to India 2024 Demographic Model).
 */
export const DEFAULT_AGE_DISTRIBUTION_CONFIG: AgeDistributionConfig = INDIA_2024_AGE_DISTRIBUTION_CONFIG;

/**
 * Preset distribution models for researchers to easily toggle different demographic setups.
 */
export const AGE_DISTRIBUTION_PRESETS: Record<string, { label: string; config: AgeDistributionConfig }> = {
  india2024: {
    label: 'India 2024 Demographic Model (SRS Empirical Pyramid)',
    config: INDIA_2024_AGE_DISTRIBUTION_CONFIG,
  },
  standard: {
    label: 'Balanced Demographics (Modern Steady State)',
    config: {
      maxInitialAge: 82,
      decayRate: 0.016,
    },
  },
  young: {
    label: 'Youth-Heavy (Developing / Expanding Society)',
    config: {
      maxInitialAge: 75,
      decayRate: 0.030,
    },
  },
  aging: {
    label: 'Aging Society (Low Birth / High Senior Proportion)',
    config: {
      maxInitialAge: 88,
      decayRate: 0.007,
    },
  },
  uniform: {
    label: 'Uniform Flat Distribution (0-80 years)',
    config: {
      maxInitialAge: 80,
      decayRate: 0.0001,
    },
  },
};

/**
 * Target demographic calibration parameters for present-day India (ORGI SRS 2024 benchmarks).
 */
export const INDIA_SRB_TARGET = 908; // 908 female births per 1,000 male births (SRS Statistical Report 2024)
export const INDIA_FEMALE_BIRTH_PROBABILITY = INDIA_SRB_TARGET / (INDIA_SRB_TARGET + 1000); // 908 / 1908 ≈ 0.475890985
export const INDIA_TFR_TARGET = 1.9; // 1.9 children per woman (SRS Statistical Report 2024, Statement 18)
export const INDIA_REPRODUCTIVE_MIN_AGE = 15;
export const INDIA_REPRODUCTIVE_MAX_AGE = 49;

/**
 * Empirical India Age-Specific Fertility Rates (ASFR) per 1,000 women per year.
 * Source: Office of the Registrar General & Census Commissioner, India (ORGI) - SRS Statistical Report.
 * Implied Completed Fertility (TFR) = 5 * sum(ASFR / 1000) = 5 * (0.0101 + 0.1328 + 0.1485 + 0.0682 + 0.0214 + 0.0052 + 0.0018) = 1.94 children per woman.
 */
export const INDIA_ASFR_SCHEDULE: ASFRIgdRate[] = [
  { minAge: 15, maxAge: 19, asfrPer1k: 10.1, annualProbability: 10.1 / 1000 },
  { minAge: 20, maxAge: 24, asfrPer1k: 132.8, annualProbability: 132.8 / 1000 },
  { minAge: 25, maxAge: 29, asfrPer1k: 148.5, annualProbability: 148.5 / 1000 },
  { minAge: 30, maxAge: 34, asfrPer1k: 68.2, annualProbability: 68.2 / 1000 },
  { minAge: 35, maxAge: 39, asfrPer1k: 21.4, annualProbability: 21.4 / 1000 },
  { minAge: 40, maxAge: 44, asfrPer1k: 5.2, annualProbability: 5.2 / 1000 },
  { minAge: 45, maxAge: 49, asfrPer1k: 1.8, annualProbability: 1.8 / 1000 },
];

/**
 * Returns the annual individual birth probability for a female of a given age based on the empirical India ASFR schedule.
 */
export function getAgeSpecificFertility(age: number): number {
  for (const bracket of INDIA_ASFR_SCHEDULE) {
    if (age >= bracket.minAge && age <= bracket.maxAge) {
      return bracket.annualProbability;
    }
  }
  return 0;
}

/**
 * Baseline annual birth probability per eligible female.
 * Across the 27 reproductive years (18-44) with an average maternal health factor of ~0.88 (mean health ~88),
 * a baseAnnualBirthRate of 0.080 yields an expected completed fertility of: 27 * (0.080 * 0.88) ≈ 1.90 children per woman.
 */
export const INDIA_BASE_ANNUAL_BIRTH_RATE = 0.080;

/**
 * Empirical Indian SRS Abridged Life Table (2020–2024) 5-year interval mortality rates (5qx).
 * Source: Office of the Registrar General & Census Commissioner, India (ORGI) - SRS Life Tables.
 */
export const INDIA_SRS_ADULT_INTERVAL_RATES: MortalityIntervalRate[] = [
  // Age 25–29: 7.2 / 1,000 -> annualQ = 1 - (1 - 0.0072)^(1/5) ≈ 0.001445
  { minAge: 25, maxAge: 29, intervalTargetQPer1k: 7.2, annualQ: 1 - Math.pow(1 - 0.0072, 1 / 5) },
  // Age 30–34: 9.4 / 1,000 -> annualQ = 1 - (1 - 0.0094)^(1/5) ≈ 0.001889
  { minAge: 30, maxAge: 34, intervalTargetQPer1k: 9.4, annualQ: 1 - Math.pow(1 - 0.0094, 1 / 5) },
  // Age 35–39: 13.5 / 1,000 -> annualQ = 1 - (1 - 0.0135)^(1/5) ≈ 0.002715
  { minAge: 35, maxAge: 39, intervalTargetQPer1k: 13.5, annualQ: 1 - Math.pow(1 - 0.0135, 1 / 5) },
  // Age 40–44: 19.8 / 1,000 -> annualQ = 1 - (1 - 0.0198)^(1/5) ≈ 0.003992
  { minAge: 40, maxAge: 44, intervalTargetQPer1k: 19.8, annualQ: 1 - Math.pow(1 - 0.0198, 1 / 5) },
  // Age 45–49: 29.8 / 1,000 -> annualQ = 1 - (1 - 0.0298)^(1/5) ≈ 0.006037
  { minAge: 45, maxAge: 49, intervalTargetQPer1k: 29.8, annualQ: 1 - Math.pow(1 - 0.0298, 1 / 5) },
  // Age 50–54: 46.2 / 1,000 -> annualQ = 1 - (1 - 0.0462)^(1/5) ≈ 0.009424
  { minAge: 50, maxAge: 54, intervalTargetQPer1k: 46.2, annualQ: 1 - Math.pow(1 - 0.0462, 1 / 5) },
  // Age 55–59: 71.5 / 1,000 -> annualQ = 1 - (1 - 0.0715)^(1/5) ≈ 0.014760
  { minAge: 55, maxAge: 59, intervalTargetQPer1k: 71.5, annualQ: 1 - Math.pow(1 - 0.0715, 1 / 5) },
  // Age 60–64: 112.0 / 1,000 -> annualQ = 1 - (1 - 0.1120)^(1/5) ≈ 0.023530
  { minAge: 60, maxAge: 64, intervalTargetQPer1k: 112.0, annualQ: 1 - Math.pow(1 - 0.1120, 1 / 5) },
  // Age 65–69: 174.5 / 1,000 -> annualQ = 1 - (1 - 0.1745)^(1/5) ≈ 0.037720
  { minAge: 65, maxAge: 69, intervalTargetQPer1k: 174.5, annualQ: 1 - Math.pow(1 - 0.1745, 1 / 5) },
  // Age 70–74: 268.0 / 1,000 -> annualQ = 1 - (1 - 0.2680)^(1/5) ≈ 0.060420
  { minAge: 70, maxAge: 74, intervalTargetQPer1k: 268.0, annualQ: 1 - Math.pow(1 - 0.2680, 1 / 5) },
  // Age 75–79: 395.0 / 1,000 -> annualQ = 1 - (1 - 0.3950)^(1/5) ≈ 0.096180
  { minAge: 75, maxAge: 79, intervalTargetQPer1k: 395.0, annualQ: 1 - Math.pow(1 - 0.3950, 1 / 5) },
  // Age 80–84: 548.0 / 1,000 -> annualQ = 1 - (1 - 0.5480)^(1/5) ≈ 0.147770
  { minAge: 80, maxAge: 84, intervalTargetQPer1k: 548.0, annualQ: 1 - Math.pow(1 - 0.5480, 1 / 5) },
];

/**
 * Calibrated Indian Empirical Multi-Phase Mortality Configuration (Step 3).
 *
 * Parameters documented according to the India Calibration Map:
 * 1. infantMortalityHazard:
 *    - Meaning: First-year infant mortality hazard (age 0 -> 1).
 *    - Unit: Annual hazard probability (0.0240).
 *    - Benchmark: IMR ≈ 24 deaths per 1,000 live births.
 *    - Source: SRS Statistical Report 2024 (Statement 25) & SRS Bulletin 2024 Vol 59-I.
 *
 * 2. earlyChildhoodAnnualHazard:
 *    - Meaning: Early childhood annual mortality hazard (ages 1–4).
 *    - Unit: Annual hazard probability (~0.001959).
 *    - Benchmark: 4q1 ≈ 7.8 deaths per 1,000 over 4 years.
 *    - Source: SRS Statistical Report 2024, Table 4.
 *
 * 3. childAnnualHazard:
 *    - Meaning: Older childhood annual mortality hazard (ages 5–14).
 *    - Unit: Annual hazard probability (~0.0002804).
 *    - Benchmark: 10q5 ≈ 2.8 deaths per 1,000 over 10 years.
 *    - Source: SRS Statistical Report 2024, Table 4.
 *
 * 4. youngAdultAnnualHazard:
 *    - Meaning: Adolescent & young adult annual mortality hazard (ages 15–24).
 *    - Unit: Annual hazard probability (~0.000642).
 *    - Benchmark: 10q15 ≈ 6.4 deaths per 1,000 over 10 years.
 *    - Source: SRS Statistical Report 2024, Table 5.
 *
 * 5. gompertzBaseline & gompertzSlope:
 *    - Meaning: Reference baseline hazard (alpha = 0.000065) and aging rate (beta = 0.082 year^-1).
 *    - Benchmark: Indian adult senescence slope across ages 25–84.
 *    - Source: SRS Abridged Life Tables 2020–2024.
 *
 * 6. oldestOldSlope:
 *    - Meaning: Progression rate of mortality in open-ended age 85+ cohort without artificial ceiling.
 *    - Unit: year^-1 (0.080).
 *    - Benchmark: Smooth open-ended senescence allowing stochastic survival past 90 and 100+.
 *
 * 7. maleHazardMultiplier & femaleHazardMultiplier:
 *    - Meaning: Sex-specific risk multipliers applied to baseline hazard.
 *    - Unit: Dimensionless scalars (male = 1.05, female = 0.81).
 *    - Benchmark: Male e0 ≈ 68.6 yrs, Female e0 ≈ 72.1 yrs (gap ≈ 3.5 yrs).
 *    - Source: SRS Life Table 2024, Statement 2.
 *
 * 8. healthMortalitySensitivity:
 *    - Meaning: Modulates baseline age risk around 1.0 according to agent biomarker vitality.
 *    - Unit: Dimensionless coefficient (0.20).
 *    - Benchmark: Preserves stochastic individual variation; avoids universal guillotine age.
 */
export const INDIA_2024_MORTALITY_CONFIG: MultiPhaseMortalityConfig = {
  infantMortalityHazard: 0.024,
  earlyChildhoodAnnualHazard: 1 - Math.pow(1 - 0.0078, 1 / 4), // ~0.001959
  childAnnualHazard: 1 - Math.pow(1 - 0.0028, 1 / 10), // ~0.0002804
  youngAdultAnnualHazard: 1 - Math.pow(1 - 0.0064, 1 / 10), // ~0.000642
  adultIntervalRates: INDIA_SRS_ADULT_INTERVAL_RATES,
  seniorHazardMultiplier: 1.15,
  gompertzBaseline: 0.000065,
  gompertzSlope: 0.082,
  oldestOldSlope: 0.080,
  maleHazardMultiplier: 1.05,
  femaleHazardMultiplier: 0.81,
  healthMortalitySensitivity: 0.20,
  criticalHealthThreshold: 5.0,
};

/**
 * Default research configuration for the prototype (calibrated to India Step 1, 2, and 3).
 */
export const DEFAULT_CONFIG: SimulationConfig = {
  initialPopulationSize: 1000,
  targetTFR: INDIA_TFR_TARGET,
  targetSexRatioAtBirth: INDIA_SRB_TARGET,
  femaleBirthProbability: INDIA_FEMALE_BIRTH_PROBABILITY,
  fertilityMultiplier: 1.0,
  baseAnnualBirthRate: INDIA_BASE_ANNUAL_BIRTH_RATE,
  minReproductionAge: INDIA_REPRODUCTIVE_MIN_AGE,
  maxReproductionAge: INDIA_REPRODUCTIVE_MAX_AGE,
  mortalityHazardBase: 0.000065, // Calibrated empirical Gompertz base hazard
  criticalHealthThreshold: 5.0,
  ageDistribution: DEFAULT_AGE_DISTRIBUTION_CONFIG,
  mortality: INDIA_2024_MORTALITY_CONFIG,
  asfrSchedule: INDIA_ASFR_SCHEDULE,
};


/**
 * Sample given names used to provide clear, identifiable identities to the simulated agents.
 */
export const SAMPLE_FIRST_NAMES = [
  'Aria', 'Ethan', 'Maya', 'Liam', 'Zoe', 'Noah', 'Elena', 'Lucas', 'Chloe', 'Oliver',
  'Sophia', 'Mason', 'Amara', 'Logan', 'Nora', 'Alexander', 'Isla', 'James', 'Mia', 'Benjamin',
  'Ava', 'Elijah', 'Harper', 'William', 'Evelyn', 'Henry', 'Abigail', 'Daniel', 'Emily', 'Matthew',
  'Hannah', 'Samuel', 'Leah', 'David', 'Audrey', 'Joseph', 'Sarah', 'Jackson', 'Stella', 'Sebastian',
];

export const SAMPLE_LAST_NAMES = [
  'Vance', 'Sterling', 'Solari', 'Chen', 'Novak', 'Mercer', 'Adler', 'Kovacs', 'Sinclair', 'Reyes',
  'Hashimoto', 'Morin', 'Castillo', 'Lindqvist', 'O\'Connor', 'Thorpe', 'Patel', 'Dubois', 'Fontana', 'Ashwood',
];

export const CAUSE_CATEGORIES = [
  'Cardiovascular disease',
  'Respiratory disease',
  'Infectious/parasitic disease',
  'Neoplasms/cancer',
  'Endocrine/nutritional/metabolic disease',
  'External causes/injuries',
  'Perinatal/congenital causes',
  'Other causes',
] as const;

export type CauseOfDeath = typeof CAUSE_CATEGORIES[number];

export interface AgeCauseDistribution {
  minAge: number;
  maxAge: number;
  weights: Record<CauseOfDeath, number>;
  sourceNote: string;
}

export const INDIA_CAUSE_OF_DEATH_DISTRIBUTIONS: AgeCauseDistribution[] = [
  {
    minAge: 0, maxAge: 0,
    weights: {
      'Perinatal/congenital causes': 0.65,
      'Infectious/parasitic disease': 0.20,
      'Respiratory disease': 0.10,
      'Cardiovascular disease': 0.01,
      'Neoplasms/cancer': 0.00,
      'Endocrine/nutritional/metabolic disease': 0.01,
      'External causes/injuries': 0.01,
      'Other causes': 0.02,
    },
    sourceNote: 'Model allocation / calibration assumption based on WHO India Infant Mortality & Perinatal Causes profile'
  },
  {
    minAge: 1, maxAge: 4,
    weights: {
      'Infectious/parasitic disease': 0.45,
      'Respiratory disease': 0.25,
      'Endocrine/nutritional/metabolic disease': 0.15,
      'External causes/injuries': 0.10,
      'Perinatal/congenital causes': 0.01,
      'Cardiovascular disease': 0.01,
      'Neoplasms/cancer': 0.01,
      'Other causes': 0.02,
    },
    sourceNote: 'Model allocation / calibration assumption based on ORGI Childhood Mortality & Infectious/Nutritional burden'
  },
  {
    minAge: 5, maxAge: 14,
    weights: {
      'Infectious/parasitic disease': 0.40,
      'External causes/injuries': 0.25,
      'Respiratory disease': 0.15,
      'Neoplasms/cancer': 0.10,
      'Cardiovascular disease': 0.02,
      'Endocrine/nutritional/metabolic disease': 0.03,
      'Perinatal/congenital causes': 0.00,
      'Other causes': 0.05,
    },
    sourceNote: 'Model allocation / calibration assumption based on WHO India Older Childhood Mortality profiles'
  },
  {
    minAge: 15, maxAge: 24,
    weights: {
      'External causes/injuries': 0.45,
      'Infectious/parasitic disease': 0.20,
      'Neoplasms/cancer': 0.15,
      'Cardiovascular disease': 0.10,
      'Respiratory disease': 0.05,
      'Endocrine/nutritional/metabolic disease': 0.02,
      'Perinatal/congenital causes': 0.00,
      'Other causes': 0.03,
    },
    sourceNote: 'Model allocation / calibration assumption based on ORGI Youth & Young Adult Injury/Infectious statistics'
  },
  {
    minAge: 25, maxAge: 44,
    weights: {
      'Cardiovascular disease': 0.30,
      'Infectious/parasitic disease': 0.20,
      'Neoplasms/cancer': 0.20,
      'External causes/injuries': 0.15,
      'Respiratory disease': 0.08,
      'Endocrine/nutritional/metabolic disease': 0.04,
      'Perinatal/congenital causes': 0.00,
      'Other causes': 0.03,
    },
    sourceNote: 'Model allocation / calibration assumption based on WHO India Adult Mortality & CVD/Cancer onset'
  },
  {
    minAge: 45, maxAge: 64,
    weights: {
      'Cardiovascular disease': 0.40,
      'Neoplasms/cancer': 0.25,
      'Respiratory disease': 0.15,
      'Endocrine/nutritional/metabolic disease': 0.10,
      'Infectious/parasitic disease': 0.05,
      'External causes/injuries': 0.02,
      'Perinatal/congenital causes': 0.00,
      'Other causes': 0.03,
    },
    sourceNote: 'Model allocation / calibration assumption based on ORGI Medical Certification of Cause of Death (MCCD) 45-64 profile'
  },
  {
    minAge: 65, maxAge: 74,
    weights: {
      'Cardiovascular disease': 0.45,
      'Respiratory disease': 0.20,
      'Neoplasms/cancer': 0.15,
      'Endocrine/nutritional/metabolic disease': 0.10,
      'Infectious/parasitic disease': 0.04,
      'External causes/injuries': 0.01,
      'Perinatal/congenital causes': 0.00,
      'Other causes': 0.05,
    },
    sourceNote: 'Model allocation / calibration assumption based on WHO India Senior Mortality profiles'
  },
  {
    minAge: 75, maxAge: 84,
    weights: {
      'Cardiovascular disease': 0.42,
      'Respiratory disease': 0.25,
      'Endocrine/nutritional/metabolic disease': 0.12,
      'Neoplasms/cancer': 0.10,
      'Other causes': 0.08,
      'Infectious/parasitic disease': 0.02,
      'External causes/injuries': 0.01,
      'Perinatal/congenital causes': 0.00,
    },
    sourceNote: 'Model allocation / calibration assumption based on ORGI MCCD 75-84 age group distribution'
  },
  {
    minAge: 85, maxAge: 150,
    weights: {
      'Cardiovascular disease': 0.38,
      'Respiratory disease': 0.30,
      'Endocrine/nutritional/metabolic disease': 0.12,
      'Other causes': 0.15,
      'Neoplasms/cancer': 0.03,
      'Infectious/parasitic disease': 0.01,
      'External causes/injuries': 0.01,
      'Perinatal/congenital causes': 0.00,
    },
    sourceNote: 'Model allocation / calibration assumption based on oldest-old degenerative multi-morbidity profiles'
  }
];

export function determineCauseOfDeath(age: number, sex: BiologicalSex, health: number): string {
  let dist = INDIA_CAUSE_OF_DEATH_DISTRIBUTIONS[INDIA_CAUSE_OF_DEATH_DISTRIBUTIONS.length - 1];
  for (const d of INDIA_CAUSE_OF_DEATH_DISTRIBUTIONS) {
    if (age >= d.minAge && age <= d.maxAge) {
      dist = d;
      break;
    }
  }

  const rand = Math.random();
  let cumulative = 0;
  for (const [cause, weight] of Object.entries(dist.weights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return cause;
    }
  }
  return 'Other causes';
}
