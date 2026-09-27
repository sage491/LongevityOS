/**
 * @file types.ts
 * @description Core domain types and interfaces for the Immortal Theory research simulation.
 * 
 * Why this file exists:
 * In software engineering (especially TypeScript), defining data contracts upfront
 * ensures that every other module (the engine, the generator, the interface) speaks
 * the exact same language without guessing field names or types.
 */

import { DiseaseRecord } from './disease/types';
import { BiomarkerProfile, AgingState } from './biomarker';

export type BiologicalSex = 'female' | 'male';

export * from './disease/types';
export * from './biomarker';

/**
 * Represents a single simulated human agent in the population.
 */
export interface Human {
  /** Unique identifier for tracking individuals across generations */
  id: string;

  /** First name or demographic designation */
  name: string;

  /** Chronological age in completed solar years (0 to 120+) */
  age: number;

  /** Biological sex (influences fertility and baseline reproductive windows) */
  sex: BiologicalSex;

  /**
   * Overall physiological integrity (0 to 100).
   * 100 = Peak vitality; 0 = Organ failure / mortality threshold.
   */
  health: number;

  /**
   * Musculoskeletal capacity (0 to 100).
   * Declines naturally with age (sarcopenia proxy) unless maintained.
   */
  strength: number;

  /**
   * Aerobic and circulatory capacity (0 to 100).
   * Influences resilience to physiological stress.
   */
  cardiovascularFitness: number;

  /**
   * Functional joint and locomotor agility (0 to 100).
   * Influences injury risk and daily survival resilience.
   */
  mobility: number;

  /**
   * Calculated biological age (in years).
   * Derived from the composite biomarker health score compared against chronological norms.
   * If health > normal for age, biologicalAge < chronologicalAge.
   */
  biologicalAge: number;

  /** Whether the individual is currently alive */
  alive: boolean;

  /** Simulation year in which the human was born */
  birthYear: number;

  /** Simulation year in which the human died (null if still alive) */
  deathYear: number | null;

  /**
   * Individual physiological aging rate multiplier (e.g. 0.75 to 1.25).
   * Introduces natural genetic and phenotypic variation in aging trajectories.
   * Individuals with lower agingRate preserve biomarkers longer.
   */
  agingRate: number;

  /** Chronological age at the time of death (null if still alive) */
  ageAtDeath?: number | null;

  /** Highest biological age this individual ever reached in their lifetime */
  maxBiologicalAgeReached: number;

  /** Recorded cause of death for demographic/research records */
  causeOfDeath?: string;

  /** Active and historical disease records for this individual */
  diseases?: DiseaseRecord[];

  /** Phase D foundational biomarker profile (7 domains) */
  biomarkers: BiomarkerProfile;

  /** Phase D biological aging state, aging velocity, and historical tracking */
  agingState: AgingState;

  /** Inherited susceptibility traits (continuous risk multiplier, default ~1.0) */
  inheritedCardiovascularRisk?: number;
  inheritedMetabolicRisk?: number;
  inheritedRespiratoryRisk?: number;
  inheritedCancerRisk?: number;
  inheritedInfectiousRisk?: number;
}

/**
 * Summary metrics of the population at a specific point in time.
 */
export interface PopulationStatistics {
  /** Current simulation year */
  year: number;

  /** Count of living humans */
  totalPopulation: number;

  /** Number of living females */
  femaleCount: number;

  /** Number of living males */
  maleCount: number;

  /** Average chronological age of living population */
  averageAge: number;

  /** Average biological age of living population */
  averageBiologicalAge: number;

  /** Difference between average chronological age and average biological age */
  biologicalAgeGap: number;

  /** Average general health score (0-100) */
  averageHealth: number;

  /** Average musculoskeletal strength score (0-100) */
  averageStrength: number;

  /** Average cardiovascular fitness score (0-100) */
  averageCardio: number;

  /** Average mobility score (0-100) */
  averageMobility: number;

  /** Number of births occurring during this year */
  births: number;

  /** Number of female births occurring during this year */
  femaleBirths?: number;

  /** Number of male births occurring during this year */
  maleBirths?: number;

  /** Crude birth rate (births per 1,000 living population) for this year */
  crudeBirthRate?: number;

  /** Observed annual sex ratio at birth (females per 1,000 males) */
  observedSexRatioAtBirth?: number;

  /** Number of deaths occurring during this year */
  deaths: number;

  /** Crude death rate (deaths per 1,000 living population) for this year */
  crudeDeathRate?: number;

  /** Oldest living individual's age */
  maxAge: number;
}

export interface MortalityIntervalRate {
  minAge: number;
  maxAge: number;
  intervalTargetQPer1k: number;
  annualQ: number;
}

/**
 * Calibration parameters for the Indian empirical multi-phase mortality model.
 * Replaces single generic adult mortality with phase-specific empirical hazards.
 */
export interface MultiPhaseMortalityConfig {
  /**
   * Phase 1: Infant Mortality Hazard (Age 0 -> 1).
   * Meaning: Probability of death during the first year of life.
   * Unit: Annual hazard probability (approx 0.0240, yielding ~24 deaths per 1,000 live births).
   * Indian benchmark: IMR ≈ 24 deaths per 1,000 live births.
   * Source: SRS Statistical Report 2024, Statement 25; SRS Bulletin 2024 Vol 59-I.
   */
  infantMortalityHazard: number;

  /**
   * Phase 2a: Early Childhood Annual Mortality Hazard (Ages 1–4).
   * Meaning: Annual mortality hazard over the 4-year early childhood interval.
   * Unit: Annual hazard probability (approx 0.001959, yielding ~7.8 cumulative deaths per 1,000).
   * Indian benchmark: 4q1 ≈ 7.8 deaths per 1,000 children over ages 1–4.
   * Source: SRS Statistical Report 2024, Table 4.
   */
  earlyChildhoodAnnualHazard: number;

  /**
   * Phase 2b: Older Childhood Annual Mortality Hazard (Ages 5–14).
   * Meaning: Annual mortality hazard over the 10-year childhood interval.
   * Unit: Annual hazard probability (approx 0.0002804, yielding ~2.8 cumulative deaths per 1,000).
   * Indian benchmark: 10q5 ≈ 2.8 deaths per 1,000 children over ages 5–14.
   * Source: SRS Statistical Report 2024, Table 4.
   */
  childAnnualHazard: number;

  /**
   * Phase 3: Adolescent & Young Adult Annual Mortality Hazard (Ages 15–24).
   * Meaning: Annual mortality hazard over the 10-year youth interval.
   * Unit: Annual hazard probability (approx 0.000642, yielding ~6.4 cumulative deaths per 1,000).
   * Indian benchmark: 10q15 ≈ 6.4 deaths per 1,000 over ages 15–24.
   * Source: SRS Statistical Report 2024, Table 5.
   */
  youngAdultAnnualHazard: number;

  /**
   * Phase 4: Adult Senescence Interval Hazards (Ages 25–84).
   * Meaning: Empirical 5-year interval mortality rates from the Indian SRS Abridged Life Tables.
   * Converted to equivalent constant annual hazards: annualQ = 1 - (1 - intervalQ)^(1/5).
   * Indian benchmark: SRS Abridged Life Table 2020–2024 5qx values.
   * Source: SRS Abridged Life Tables 2020–2024 (Census India / ORGI Catalog 47148).
   */
  adultIntervalRates: MortalityIntervalRate[];

  /**
   * Senior Mortality Calibration Multiplier (Ages 65–84).
   * Meaning: Fine-tuning scalar applied to baseline hazard for ages 65–84 to balance health modifier effects.
   * Unit: Dimensionless scalar (default: 1.15).
   * Benchmark: Calibrates interval mortality for 65–69 (174.5/1k), 70–74 (268/1k), 75–79 (395/1k), and 80–84 (548/1k).
   */
  seniorHazardMultiplier?: number;

  /**
   * Gompertz Baseline Hazard (alpha).
   * Meaning: Base reference hazard for adult senescence.
   * Unit: Dimensionless baseline annual rate.
   * Indian benchmark: ~0.000065.
   */
  gompertzBaseline: number;

  /**
   * Gompertz Slope / Rate of Aging (beta).
   * Meaning: Exponential rate of mortality hazard acceleration per year of adult age.
   * Unit: year^-1.
   * Indian benchmark: ~0.082.
   */
  gompertzSlope: number;

  /**
   * Phase 5: Oldest-Old Hazard Progression Slope (Ages 85+).
   * Meaning: Exponential hazard progression factor in the open-ended 85+ cohort without artificial ceiling.
   * Unit: year^-1.
   * Indian benchmark: Open-ended mortality structure allowing stochastic survival past 90 and 100+.
   */
  oldestOldSlope: number;

  /**
   * Sex Differential: Male Mortality Hazard Multiplier.
   * Meaning: Multiplier applied to baseline hazard for biological males.
   * Unit: Dimensionless scalar (default: 1.05).
   * Indian benchmark: Male life expectancy e0 ≈ 68.6 years.
   * Source: SRS Life Table 2024, Statement 2.
   */
  maleHazardMultiplier: number;

  /**
   * Sex Differential: Female Mortality Hazard Multiplier.
   * Meaning: Multiplier applied to baseline hazard for biological females.
   * Unit: Dimensionless scalar (default: 0.81).
   * Indian benchmark: Female life expectancy e0 ≈ 72.1 years (~3.5 year female survival advantage).
   * Source: SRS Life Table 2024, Statement 2.
   */
  femaleHazardMultiplier: number;

  /**
   * Health Mortality Interaction Sensitivity.
   * Meaning: Extent to which an individual's biomarker health modulates baseline age hazard.
   * Unit: Dimensionless sensitivity coefficient (0.0 = purely chronological; 0.20 = moderate modulation).
   * Indian benchmark: Preserves stochastic health variation without letting health decay act as an artificial universal death age.
   */
  healthMortalitySensitivity: number;

  /**
   * Health score threshold below which frailty hazard smoothly rises.
   * Meaning: Critical physiological reserve boundary.
   * Unit: Health score points (0 to 100 scale, default: 5).
   */
  criticalHealthThreshold: number;
}

/**
 * Detailed statistical report auditing the simulation against the Indian SRS mortality benchmarks.
 */
export interface MortalityCalibrationReport {
  imr: { observed: number; target: number; unit: string; description: string };
  age1_4: { observed: number; target: number; unit: string; description: string };
  age5_14: { observed: number; target: number; unit: string; description: string };
  age15_24: { observed: number; target: number; unit: string; description: string };
  age25_44: { observed: number; target: number; unit: string; description: string };
  age45_64: { observed: number; target: number; unit: string; description: string };
  age65_74: { observed: number; target: number; unit: string; description: string };
  age75_84: { observed: number; target: number; unit: string; description: string };
  age85PlusDeaths: { observedCount: number; targetDescription: string };
  maleLifeExpectancy: { observed: number; target: number; unit: string };
  femaleLifeExpectancy: { observed: number; target: number; unit: string };
  overallLifeExpectancy: { observed: number; target: number; unit: string };
  medianAgeAtDeath: { observed: number; target: number; unit: string };
  maxObservedAge: { observed: number; target: string; unit: string };
  survivedTo80: { observedCount: number; observedPct: number; targetPct: number };
  survivedTo90: { observedCount: number; observedPct: number; targetPct: number };
  survivedTo100: { observedCount: number; observedPct: number; targetPct: number };
}

/**
 * Actuarial and longevity metrics computed over all deceased and living individuals.
 */
export interface LongevityStatistics {
  /** Total number of deceased individuals recorded */
  totalDeceasedCount: number;

  /** Average lifespan (age at death) across all deceased individuals */
  averageLifespan: number;

  /** Median lifespan across all deceased individuals */
  medianLifespan: number;

  /** Maximum lifespan recorded among deceased individuals (or all-time max age) */
  maxLifespan: number;

  /** Deceased male count */
  maleDeceasedCount: number;

  /** Deceased female count */
  femaleDeceasedCount: number;

  /** Average lifespan for males */
  maleAverageLifespan: number;

  /** Average lifespan for females */
  femaleAverageLifespan: number;

  /** Median lifespan for males */
  maleMedianLifespan: number;

  /** Median lifespan for females */
  femaleMedianLifespan: number;

  /** Number of people who reached age 70+ (living or deceased) */
  reachedAge70: number;

  /** Number of people who reached age 80+ (living or deceased) */
  reachedAge80: number;

  /** Number of people who reached age 85+ (living or deceased - confirms 80-82 ceiling broken) */
  reachedAge85: number;

  /** Number of people who reached age 90+ (living or deceased) */
  reachedAge90: number;

  /** Number of people who reached age 100+ (centenarians, living or deceased) */
  reachedAge100Plus: number;

  /** Deaths grouped by age brackets */
  deathsByAgeRange: Record<string, number>;

  /** Full India mortality calibration audit report */
  mortalityReport: MortalityCalibrationReport;
}

/**
 * Represents the configuration parameters for the initial mixed-age population distribution model.
 * Researchers can configure how a mixed-age civilization is initialized (e.g. developing, stable, aging).
 */
export interface AgeDistributionConfig {
  /** Maximum lifespan cap for initialization (default: 85) */
  maxInitialAge: number;

  /**
   * Exponential decay rate parameter (lambda) modeling steady-state survival dropoff.
   * Higher values produce younger populations (wider base); lower values flatten the pyramid.
   * Default: ~0.018 (representing a steady, realistic demographic pyramid up to 85)
   */
  decayRate: number;

  /**
   * Optional age group weights if using tiered distribution or customized brackets.
   * [minAge, maxAge, relativeWeight]
   */
  brackets?: Array<{
    minAge: number;
    maxAge: number;
    weight: number;
  }>;
}

export interface ASFRIgdRate {
  minAge: number;
  maxAge: number;
  asfrPer1k: number;
  annualProbability: number;
}

/**
 * Configuration parameters for the simulation engine.
 * Researchers can adjust these parameters to observe different population outcomes.
 */
export interface SimulationConfig {
  /** Size of the starting cohort (default: 1000) */
  initialPopulationSize: number;

  /** Target Total Fertility Rate (TFR) for present-day India (children per woman, default: 1.9) */
  targetTFR: number;

  /** Target Sex Ratio at Birth for present-day India (female births per 1,000 male births, default: 908) */
  targetSexRatioAtBirth: number;

  /** Stochastic probability that a newborn is female = targetSexRatioAtBirth / (targetSexRatioAtBirth + 1000) */
  femaleBirthProbability: number;

  /** Baseline natural birth probability multiplier (default: 1.0) */
  fertilityMultiplier: number;

  /** Baseline natural birth probability per eligible adult female per year */
  baseAnnualBirthRate: number;

  /** Minimum reproductive age (default: 18) */
  minReproductionAge: number;

  /** Maximum reproductive age (default: 44) */
  maxReproductionAge: number;

  /** Base annual mortality hazard exponent (Gompertz-like acceleration) */
  mortalityHazardBase: number;

  /** Health score threshold below which death is imminent (default: 5) */
  criticalHealthThreshold: number;

  /** Initial population age distribution parameters */
  ageDistribution: AgeDistributionConfig;

  /** Multi-phase Indian baseline mortality configuration (Step 3) */
  mortality: MultiPhaseMortalityConfig;

  /** India Age-Specific Fertility Rate (ASFR) schedule */
  asfrSchedule?: ASFRIgdRate[];
}

export interface CauseOfDeathStatistics {
  totalDeaths: number;
  deathsByCause: Record<string, number>;
  causePercentages: Record<string, number>;
  deathsByCauseAndAge: Record<string, Record<string, number>>;
  deathsByCauseAndSex: Record<string, Record<string, number>>;
  averageAgeAtDeathByCause: Record<string, number>;
}

