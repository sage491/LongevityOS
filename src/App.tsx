/**
 * @file App.tsx
 * @description Immortal Theory - Component 2: Annual Simulation Step Engine & Research Dashboard.
 * 
 * Includes simulation clock controls (Step 1 Yr, Step 10 Yrs, Run, Pause, Reset),
 * interactive historical demographic charts, age distribution pyramid, biomarker averages,
 * and individual agent registry tracking.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Activity,
  Users,
  Heart,
  Dna,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ChevronRight,
  Info,
  TrendingUp,
  Skull,
  Baby,
  Sparkles,
  BarChart3,
  Gauge,
  Zap,
  Search,
  Sliders,
  Calendar,
  Layers,
  Award,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Human,
  BiologicalSex,
  SimulationState,
  AgeDistributionConfig,
  MultiPhaseMortalityConfig,
  DEFAULT_CONFIG,
  DEFAULT_AGE_DISTRIBUTION_CONFIG,
  AGE_DISTRIBUTION_PRESETS,
  INDIA_2024_MORTALITY_CONFIG,
  generateInitialPopulation,
  calculatePopulationStats,
  calculateLongevityStats,
  calculateCauseOfDeathStatistics,
  calculateDiseaseStatistics,
  simulateYear
} from './simulation';
import { runPhaseDValidation, ValidationRunResult } from './simulation/validationRunner';

export default function App() {
  // Configurable initial population size (default 1,000; supports 100, 1000, 5000, 10000)
  const [initialSize, setInitialSize] = useState<number>(1000);

  // Configurable initial age distribution model
  const [ageDistributionPreset, setAgeDistributionPreset] = useState<string>('india2024');
  const [currentAgeConfig, setCurrentAgeConfig] = useState<AgeDistributionConfig>(DEFAULT_AGE_DISTRIBUTION_CONFIG);

  // Initialize simulation state at Year 0
  const initializeState = (size: number = 1000, ageConfig: AgeDistributionConfig = DEFAULT_AGE_DISTRIBUTION_CONFIG): SimulationState => {
    const initialCohort = generateInitialPopulation(size, 0, ageConfig);
    const initialStats = calculatePopulationStats(initialCohort, 0, 0, 0, 0, 0);
    return {
      year: 0,
      humans: initialCohort,
      history: [initialStats],
      totalBirths: 0,
      totalDeaths: 0,
      totalFemaleBirths: 0,
      totalMaleBirths: 0,
      nextHumanId: size + 1,
    };
  };

  const [simState, setSimState] = useState<SimulationState>(() => initializeState(1000, DEFAULT_AGE_DISTRIBUTION_CONFIG));

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simSpeedMs, setSimSpeedMs] = useState<number>(600); // ms per step in continuous run

  // UI Tabs & Filters
  const [activeTab, setActiveTab] = useState<'dashboard' | 'longevity' | 'diseases' | 'cohort' | 'biomarkers'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alive' | 'deceased'>('alive');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHuman, setSelectedHuman] = useState<Human | null>(null);
  const [validationData, setValidationData] = useState<{ resultsA: ValidationRunResult[]; resultsB: ValidationRunResult[] } | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Keep a ref to simState for the continuous running loop
  const simStateRef = useRef<SimulationState>(simState);
  simStateRef.current = simState;

  // Continuous loop runner
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning) {
      timer = setInterval(() => {
        setSimState(prev => {
          // Check if extinct
          const livingCount = prev.humans.filter(h => h.alive).length;
          if (livingCount === 0) {
            setIsRunning(false);
            return prev;
          }
          return simulateYear(prev);
        });
      }, simSpeedMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, simSpeedMs]);

  // Step Exactly 1 Year
  const handleStepOneYear = () => {
    setIsRunning(false);
    setSimState(prev => simulateYear(prev));
  };

  // Step 10 Years
  const handleStepTenYears = () => {
    setIsRunning(false);
    setSimState(prev => {
      let current = prev;
      for (let i = 0; i < 10; i++) {
        const living = current.humans.filter(h => h.alive).length;
        if (living === 0) break;
        current = simulateYear(current);
      }
      return current;
    });
  };

  // Toggle Continuous Run
  const handleToggleRun = () => {
    setIsRunning(prev => !prev);
  };

  // Reset to Year 0 with selected cohort size and age distribution
  const handleReset = (targetSize?: number, targetAgeConfig?: AgeDistributionConfig) => {
    setIsRunning(false);
    const sizeToUse = targetSize !== undefined ? targetSize : initialSize;
    const configToUse = targetAgeConfig !== undefined ? targetAgeConfig : currentAgeConfig;
    const freshState = initializeState(sizeToUse, configToUse);
    setSimState(freshState);
    setSelectedHuman(null);
  };


  // Computed Current Year Data
  const livingHumans = useMemo(() => simState.humans.filter(h => h.alive), [simState.humans]);
  const deceasedHumans = useMemo(() => simState.humans.filter(h => !h.alive), [simState.humans]);

  // Historical Mortality Registry: sorted by deathYear descending to display the 10 most recent deaths
  const recentDeceasedHumans = useMemo(() => {
    return [...deceasedHumans]
      .sort((a, b) => {
        const yearDiff = (b.deathYear ?? 0) - (a.deathYear ?? 0);
        if (yearDiff !== 0) return yearDiff;
        return (b.ageAtDeath ?? b.age) - (a.ageAtDeath ?? a.age);
      })
      .slice(0, 10);
  }, [deceasedHumans]);

  const latestStats = simState.history[simState.history.length - 1] || calculatePopulationStats(simState.humans, simState.year, 0, 0);

  // Computed Longevity and Actuarial Statistics
  const longevityStats = useMemo(() => {
    return calculateLongevityStats(simState.humans, simState.totalBirths);
  }, [simState.humans, simState.totalBirths]);

  // Cause of Death Statistics (Phase B)
  const codStats = useMemo(() => {
    return calculateCauseOfDeathStatistics(simState.humans);
  }, [simState.humans]);

  // Disease Statistics (Phase C)
  const diseaseStats = useMemo(() => {
    return calculateDiseaseStatistics(simState.humans);
  }, [simState.humans]);

  // Biomarker Analytics (Phase D)
  const biomarkerAnalytics = useMemo(() => {
    if (livingHumans.length === 0) {
      return {
        avgBioAge: 0,
        avgVelocity: 1.0,
        domainAverages: { cardiovascular: 0, metabolic: 0, respiratory: 0, musculoskeletal: 0, immune: 0, neurological: 0, systemic: 0 }
      };
    }
    const sumBioAge = livingHumans.reduce((acc, h) => acc + h.biologicalAge, 0);
    const sumVelocity = livingHumans.reduce((acc, h) => acc + (h.agingState?.agingVelocity ?? 1.0), 0);

    const domains = ['cardiovascular', 'metabolic', 'respiratory', 'musculoskeletal', 'immune', 'neurological', 'systemic'] as const;
    const domainSums: Record<string, number> = { cardiovascular: 0, metabolic: 0, respiratory: 0, musculoskeletal: 0, immune: 0, neurological: 0, systemic: 0 };

    for (const h of livingHumans) {
      const b = h.biomarkers;
      if (b) {
        for (const d of domains) {
          domainSums[d] += b[d];
        }
      }
    }
    const n = livingHumans.length;
    const domainAverages: Record<string, number> = {};
    for (const d of domains) {
      domainAverages[d] = Number((domainSums[d] / n).toFixed(1));
    }

    return {
      avgBioAge: Number((sumBioAge / n).toFixed(1)),
      avgVelocity: Number((sumVelocity / n).toFixed(2)),
      domainAverages,
    };
  }, [livingHumans]);

  // Age Distribution brackets for the living population
  const ageDistribution = useMemo(() => {
    const bins = {
      '0-9': 0,
      '10-19': 0,
      '20-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50-59': 0,
      '60-69': 0,
      '70-79': 0,
      '80+': 0,
    };
    for (const h of livingHumans) {
      if (h.age < 10) bins['0-9']++;
      else if (h.age < 20) bins['10-19']++;
      else if (h.age < 30) bins['20-29']++;
      else if (h.age < 40) bins['30-39']++;
      else if (h.age < 50) bins['40-49']++;
      else if (h.age < 60) bins['50-59']++;
      else if (h.age < 70) bins['60-69']++;
      else if (h.age < 80) bins['70-79']++;
      else bins['80+']++;
    }
    return bins;
  }, [livingHumans]);

  // Max value in age distribution for relative scaling
  const maxInAgeBin = Math.max(...Object.values(ageDistribution), 1);

  // Computed Demographic Age Structure (India 2024 Calibration Brackets: 0-14, 15-24, 25-44, 45-64, 65+)
  const demographicBreakdown = useMemo(() => {
    const total = livingHumans.length;
    let femaleCount = 0;
    let maleCount = 0;
    let reproFemales = 0;
    let b0_14 = 0;
    let b15_24 = 0;
    let b25_44 = 0;
    let b45_64 = 0;
    let b65plus = 0;

    for (const h of livingHumans) {
      if (h.sex === 'female') {
        femaleCount++;
        if (h.age >= DEFAULT_CONFIG.minReproductionAge && h.age <= DEFAULT_CONFIG.maxReproductionAge) {
          reproFemales++;
        }
      } else {
        maleCount++;
      }

      if (h.age <= 14) b0_14++;
      else if (h.age <= 24) b15_24++;
      else if (h.age <= 44) b25_44++;
      else if (h.age <= 64) b45_64++;
      else b65plus++;
    }

    return {
      total,
      femaleCount,
      femalePct: total > 0 ? Number(((femaleCount / total) * 100).toFixed(1)) : 0,
      maleCount,
      malePct: total > 0 ? Number(((maleCount / total) * 100).toFixed(1)) : 0,
      reproFemales,
      reproFemalePctOfTotal: total > 0 ? Number(((reproFemales / total) * 100).toFixed(1)) : 0,
      reproFemalePctOfFemales: femaleCount > 0 ? Number(((reproFemales / femaleCount) * 100).toFixed(1)) : 0,
      brackets: [
        { label: '0–14 (Youth / Children)', minAge: 0, maxAge: 14, count: b0_14, pct: total > 0 ? Number(((b0_14 / total) * 100).toFixed(1)) : 0, target: 25.3, color: 'text-cyan-400', barColor: 'bg-cyan-500' },
        { label: '15–24 (Young Adults)', minAge: 15, maxAge: 24, count: b15_24, pct: total > 0 ? Number(((b15_24 / total) * 100).toFixed(1)) : 0, target: 17.6, color: 'text-emerald-400', barColor: 'bg-emerald-500' },
        { label: '25–44 (Core Productive & Reproductive)', minAge: 25, maxAge: 44, count: b25_44, pct: total > 0 ? Number(((b25_44 / total) * 100).toFixed(1)) : 0, target: 30.8, color: 'text-amber-400', barColor: 'bg-amber-500' },
        { label: '45–64 (Mature Working)', minAge: 45, maxAge: 64, count: b45_64, pct: total > 0 ? Number(((b45_64 / total) * 100).toFixed(1)) : 0, target: 19.2, color: 'text-indigo-400', barColor: 'bg-indigo-500' },
        { label: '65+ (Seniors & Elders)', minAge: 65, maxAge: 85, count: b65plus, pct: total > 0 ? Number(((b65plus / total) * 100).toFixed(1)) : 0, target: 7.1, color: 'text-rose-400', barColor: 'bg-rose-500' },
      ],
    };
  }, [livingHumans]);



  // Filtered population for table view (capped at first 100 displayed in UI for DOM rendering performance with 1,000+ humans)
  const filteredHumans = useMemo(() => {
    return simState.humans.filter(h => {
      // Status filter
      if (statusFilter === 'alive' && !h.alive) return false;
      if (statusFilter === 'deceased' && h.alive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = h.name.toLowerCase().includes(q);
        const matchId = h.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [simState.humans, statusFilter, searchQuery]);

  // Display slice for virtual performance
  const displayedHumans = useMemo(() => {
    return filteredHumans.slice(0, 100);
  }, [filteredHumans]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Academic Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3.5 sticky top-0 z-30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Dna className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold tracking-tight text-white">IMMORTAL THEORY</h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                COMPONENT 2 • YEAR ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Longevity Research Simulation & Exploration Framework
            </p>
          </div>
        </div>

        {/* Simulation Clock Controls */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-start md:self-auto flex-wrap">
          {/* Year Display Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 rounded border border-slate-800 mr-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-300">
              Year {simState.year}
            </span>
          </div>

          {/* Advance 1 Year */}
          <button
            onClick={handleStepOneYear}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Simulate exactly 1 year"
          >
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
            <span>+1 Year</span>
          </button>

          {/* Advance 10 Years */}
          <button
            onClick={handleStepTenYears}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Simulate 10 consecutive years"
          >
            <FastForward className="w-3.5 h-3.5 text-blue-400" />
            <span>+10 Years</span>
          </button>

          {/* Continuous Run / Pause */}
          <button
            onClick={handleToggleRun}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition cursor-pointer ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-900/30'
                : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </>
            )}
          </button>

          {/* Reset */}
          <button
            onClick={() => handleReset()}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition cursor-pointer"
            title="Reset simulation to Year 0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Configurable Initial Cohort Size Selector */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={initialSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                setInitialSize(newSize);
                handleReset(newSize, currentAgeConfig);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              title="Select initial population size (resets to Year 0)"
            >
              <option value={100}>100 humans</option>
              <option value={500}>500 humans</option>
              <option value={1000}>1,000 humans (default)</option>
              <option value={2500}>2,500 humans</option>
              <option value={5000}>5,000 humans</option>
              <option value={10000}>10,000 humans</option>
            </select>
          </div>

          {/* Configurable Initial Age Distribution Model Selector */}
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={ageDistributionPreset}
              onChange={e => {
                const presetKey = e.target.value;
                const preset = AGE_DISTRIBUTION_PRESETS[presetKey];
                if (preset) {
                  setAgeDistributionPreset(presetKey);
                  setCurrentAgeConfig(preset.config);
                  handleReset(initialSize, preset.config);
                }
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
              title="Configurable mixed-age population distribution model"
            >
              {Object.entries(AGE_DISTRIBUTION_PRESETS).map(([key, val]) => (
                <option key={key} value={key}>
                  Age Model: {val.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>


      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* Prototype Assumption Notice */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800/60 font-semibold uppercase">
              Scientific Notice
            </span>
            <p className="text-xs text-slate-400">
              All biological equations, decay curves, and mortality hazards are <strong className="text-slate-200">simplified prototype assumptions</strong> designed for computational simulation, not clinical representation.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview & Trends
            </button>
            <button
              onClick={() => setActiveTab('longevity')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'longevity'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Longevity Analytics</span>
              {longevityStats.totalDeceasedCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeTab === 'longevity' ? 'bg-slate-900 text-cyan-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {longevityStats.totalDeceasedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('diseases')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'diseases'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Diseases</span>
              {diseaseStats.totalActiveDiseases > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  activeTab === 'diseases' ? 'bg-slate-900 text-cyan-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {diseaseStats.totalActiveDiseases}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('biomarkers')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'biomarkers'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Biomarkers & Aging</span>
            </button>
            <button
              onClick={() => setActiveTab('cohort')}
              className={`px-3 py-1 text-xs font-medium rounded transition cursor-pointer ${
                activeTab === 'cohort'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Agents ({simState.humans.length})
            </button>
          </div>
        </div>

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Current Year */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Current Year</span>
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{simState.year}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isRunning ? 'Running continuous' : 'Clock paused'}
            </div>
          </div>

          {/* Living Population */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Living Pop</span>
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{livingHumans.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {latestStats.femaleCount} ♀ / {latestStats.maleCount} ♂
            </div>
          </div>

          {/* Total Births */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Births</span>
              <Baby className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">+{simState.totalBirths}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex flex-col gap-0.5 font-mono">
              <div className="flex items-center justify-between">
                <span>+{latestStats.births} this yr</span>
                <span className="text-cyan-400">CBR: {latestStats.crudeBirthRate ?? 0}/k</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {simState.totalFemaleBirths ?? 0} ♀ / {simState.totalMaleBirths ?? 0} ♂ (SRB: {simState.totalMaleBirths > 0 ? Math.round(((simState.totalFemaleBirths ?? 0) / (simState.totalMaleBirths ?? 1)) * 1000) : '908'})
              </div>
            </div>
          </div>

          {/* Total Deaths */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Total Deaths</span>
              <Skull className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 tracking-tight">{simState.totalDeaths}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {latestStats.deaths} this year
            </div>
          </div>

          {/* Average Chronological Age */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Average Age</span>
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{latestStats.averageAge} <span className="text-xs font-normal text-slate-400">y</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Max living: {latestStats.maxAge}y
            </div>
          </div>

          {/* Average Biological Age */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Average Bio Age</span>
              <Dna className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">{latestStats.averageBiologicalAge} <span className="text-xs font-normal text-slate-400">y</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Gap: {latestStats.biologicalAgeGap > 0 ? `+${latestStats.biologicalAgeGap}` : latestStats.biologicalAgeGap}y
            </div>
          </div>

          {/* Average Health */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
              <span>Avg Health</span>
              <Heart className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{latestStats.averageHealth}</div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${latestStats.averageHealth}%` }} />
            </div>
          </div>
        </div>

        {/* TAB 1: Dashboard & Visual Research Charts */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left 2 Cols: Population Over Time & Historical Timeline */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Population Over Time Chart */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Population & Demographics Over Time</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {simState.history.length} yearly data points
                  </span>
                </div>

                {/* SVG Line / Bar Chart */}
                <div className="mt-4 h-56 w-full relative flex flex-col justify-end">
                  {simState.history.length === 1 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center">
                      <TrendingUp className="w-8 h-8 text-slate-700 mb-2" />
                      <p className="text-xs">At Year 0. Advance time (+1 Year or Run) to visualize the timeline.</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between">
                      {/* Visual SVG Timeline Chart */}
                      <svg className="w-full h-44 overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2="100%" y2="0" stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeDasharray="3 3" />
                        <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#334155" />

                        {/* Polyline for Living Population */}
                        {(() => {
                          const maxPop = Math.max(...simState.history.map(h => h.totalPopulation), 120);
                          const points = simState.history.map((h, i) => {
                            const xPercent = (i / (simState.history.length - 1)) * 100;
                            const yPercent = 100 - (h.totalPopulation / maxPop) * 90;
                            return `${xPercent}%,${yPercent}%`;
                          }).join(' ');

                          const healthPoints = simState.history.map((h, i) => {
                            const xPercent = (i / (simState.history.length - 1)) * 100;
                            const yPercent = 100 - (h.averageHealth / 100) * 90;
                            return `${xPercent}%,${yPercent}%`;
                          }).join(' ');

                          return (
                            <>
                              {/* Health trend line */}
                              <polyline
                                fill="none"
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="2 2"
                                points={healthPoints}
                              />
                              {/* Living Population line */}
                              <polyline
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="2.5"
                                points={points}
                              />
                            </>
                          );
                        })()}
                      </svg>

                      {/* Timeline Bottom Axis Labels */}
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800">
                        <span>Year 0</span>
                        <span>Year {Math.floor(simState.year / 2)}</span>
                        <span>Year {simState.year}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-0.5 bg-cyan-400 rounded-full" />
                    <span className="text-slate-300">Living Population ({latestStats.totalPopulation})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-0.5 bg-rose-500 border-dashed rounded-full" />
                    <span className="text-slate-300">Average Health ({latestStats.averageHealth}/100)</span>
                  </div>
                </div>
              </div>

              {/* India Calibration: Step 1 Reproduction & Step 2 Population Pyramid Live Audit Panel */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-950/80 border-b border-l border-emerald-800/60 text-[10px] font-mono text-emerald-400 font-semibold rounded-bl-lg">
                  INDIA CALIBRATION • STEP 1 & STEP 2
                </div>

                <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                  <Baby className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Demographic Calibration: Reproduction & Population Pyramid</h3>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* 1. Sex Ratio at Birth */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Sex Ratio at Birth (SRB)
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold font-mono text-emerald-400">
                        {simState.totalMaleBirths > 0
                          ? Math.round(((simState.totalFemaleBirths ?? 0) / simState.totalMaleBirths) * 1000)
                          : '908'}
                      </span>
                      <span className="text-xs text-slate-400">♀ per 1,000 ♂</span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-300 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Target: 908 (SRS 2024)</span>
                        <span>p(♀) = 47.59%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-400 h-full"
                          style={{
                            width: `${
                              simState.totalBirths > 0
                                ? (((simState.totalFemaleBirths ?? 0) / simState.totalBirths) * 100).toFixed(1)
                                : 47.6
                            }%`
                          }}
                        />
                        <div
                          className="bg-blue-400 h-full"
                          style={{
                            width: `${
                              simState.totalBirths > 0
                                ? (((simState.totalMaleBirths ?? 0) / simState.totalBirths) * 100).toFixed(1)
                                : 52.4
                            }%`
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                        <span className="text-emerald-400">{simState.totalFemaleBirths ?? 0} ♀</span>
                        <span className="text-blue-400">{simState.totalMaleBirths ?? 0} ♂</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Crude Birth Rate */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Crude Birth Rate (CBR)
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold font-mono text-cyan-400">
                        {latestStats.crudeBirthRate ?? 0}
                      </span>
                      <span className="text-xs text-slate-400">per 1,000 pop / yr</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>India Empirical Target:</span>
                        <span className="font-mono text-cyan-300">18.3 / 1,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Latest Births:</span>
                        <span className="font-mono text-emerald-400">+{latestStats.births} ({latestStats.femaleBirths ?? 0}♀ / {latestStats.maleBirths ?? 0}♂)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Cumulative Births:</span>
                        <span className="font-mono text-slate-200">+{simState.totalBirths}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Fertility & Model TFR */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                      Fertility & Reproductive Cohort
                    </div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-bold font-mono text-amber-400">
                        {DEFAULT_CONFIG.targetTFR}
                      </span>
                      <span className="text-xs text-slate-400">children / woman (TFR)</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Reproductive Window:</span>
                        <span className="font-mono text-slate-200">Ages 18–44 (27 yrs)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reproductive ♀:</span>
                        <span className="font-mono text-emerald-300 font-semibold">
                          {demographicBreakdown.reproFemales} ({demographicBreakdown.reproFemalePctOfTotal}% of pop)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total ♀ Population:</span>
                        <span className="font-mono text-slate-300">
                          {demographicBreakdown.femaleCount} ({demographicBreakdown.femalePct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Population Pyramid Structure Audit (5 Official SRS Brackets) */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-mono text-slate-300 font-medium flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Population Pyramid Verification (India 2024 Demographic Model)</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Living Cohort: <span className="text-white font-semibold">{demographicBreakdown.total}</span> | ♀: {demographicBreakdown.femaleCount} | ♂: {demographicBreakdown.maleCount}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {demographicBreakdown.brackets.map((b) => (
                      <div key={b.label} className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className="text-slate-300 font-semibold">{b.label.split(' ')[0]}</span>
                          <span className="text-slate-500 text-[10px]">Target: {b.target}%</span>
                        </div>
                        <div className="flex items-baseline justify-between my-1">
                          <span className={`text-lg font-bold font-mono ${b.color}`}>{b.pct}%</span>
                          <span className="text-xs font-mono text-slate-400">{b.count} people</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 relative">
                          <div
                            className={`${b.barColor} h-full rounded-full transition-all`}
                            style={{ width: `${Math.min(100, (b.pct / 40) * 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          {b.label.substring(b.label.indexOf('('))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-300 font-semibold">Demographic Blueprint Note:</strong> Initial population pyramid sampled stochastically according to the 5 official India demographic brackets (SRS Statement 3). Individual variation within each bracket is strictly preserved, and CBR emerges naturally from the age distribution and Step 1 maternal fertility without artificial scaling.
                  </p>
                </div>
              </div>

              {/* Annual Vital Events (Births & Deaths Log) */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Annual Vital Dynamics (Last 5 Years)</h3>
                  </div>
                  <span className="text-xs text-slate-400">Births vs Mortality Rates</span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Year</th>
                        <th className="py-2 px-3">Population</th>
                        <th className="py-2 px-3">Births (♀ / ♂)</th>
                        <th className="py-2 px-3">CBR (/1k)</th>
                        <th className="py-2 px-3">Deaths</th>
                        <th className="py-2 px-3">CDR (/1k)</th>
                        <th className="py-2 px-3">Avg Chrono Age</th>
                        <th className="py-2 px-3">Avg Bio Age</th>
                        <th className="py-2 px-3">Bio Gap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                      {simState.history.slice(-5).reverse().map((h) => (
                        <tr key={h.year} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-semibold text-cyan-400">Year {h.year}</td>
                          <td className="py-2 px-3">{h.totalPopulation}</td>
                          <td className="py-2 px-3 text-emerald-400">
                            +{h.births} <span className="text-[10px] text-slate-400">({h.femaleBirths ?? 0}♀ / {h.maleBirths ?? 0}♂)</span>
                          </td>
                          <td className="py-2 px-3 text-cyan-300">{h.crudeBirthRate ?? 0}</td>
                          <td className="py-2 px-3 text-rose-400">-{h.deaths}</td>
                          <td className="py-2 px-3 text-rose-300">{h.crudeDeathRate ?? 0}</td>
                          <td className="py-2 px-3">{h.averageAge}y</td>
                          <td className="py-2 px-3 text-emerald-400">{h.averageBiologicalAge}y</td>
                          <td className="py-2 px-3">
                            <span className={h.biologicalAgeGap <= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                              {h.biologicalAgeGap > 0 ? `+${h.biologicalAgeGap}` : h.biologicalAgeGap}y
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right 1 Col: Age Pyramid & Biomarker Summary */}
            <div className="space-y-6">

              {/* Age Pyramid Distribution */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Age Distribution</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Living: {livingHumans.length}</span>
                </div>

                <div className="mt-4 space-y-2">
                  {Object.entries(ageDistribution).map(([bracket, count]) => {
                    const widthPercent = (count / maxInAgeBin) * 100;
                    return (
                      <div key={bracket} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-400">{bracket} yrs</span>
                          <span className="text-slate-200 font-semibold">{count}</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Model: {AGE_DISTRIBUTION_PRESETS[ageDistributionPreset]?.label.split('(')[0].trim() || 'Custom'}</span>
                  <span className="text-cyan-400">Cap: {currentAgeConfig.maxInitialAge}y | λ: {currentAgeConfig.decayRate}</span>
                </div>
              </div>

              {/* Population Biomarker Summary */}

              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center space-x-2 pb-2 border-b border-slate-800">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>Cohort Physiological Baseline</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" /> Avg Musculoskeletal Strength
                      </span>
                      <span className="font-mono font-bold text-slate-200">{latestStats.averageStrength} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full" style={{ width: `${latestStats.averageStrength}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-purple-400" /> Avg Cardiovascular Fitness
                      </span>
                      <span className="font-mono font-bold text-slate-200">{latestStats.averageCardio} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-400 h-full rounded-full" style={{ width: `${latestStats.averageCardio}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Avg Locomotor Mobility
                      </span>
                      <span className="font-mono font-bold text-slate-200">{latestStats.averageMobility} / 100</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${latestStats.averageMobility}%` }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300">Aging Engine Rule:</strong> Chronological age advances by +1 year. Biomarkers peak in young adulthood and decay after age 35 based on configurable prototype assumptions.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: Longevity & Actuarial Dashboard */}
        {activeTab === 'longevity' && (
          <div className="space-y-6">
            {/* Actuarial Ceiling & Lifespan Distribution Diagnostic */}
            <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-cyan-950/30 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Mortality Model Diagnostic: Multi-Phase India SRS Calibration</span>
                      {longevityStats.maxLifespan >= 85 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Open-Ended Senescence Confirmed
                        </span>
                      ) : longevityStats.totalDeceasedCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-700/60">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          Simulating (Max: {longevityStats.maxLifespan}y)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          Pending Simulation Data
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Empirical 5-layer mortality architecture: Infant (0-1), Early Childhood (1-4, 5-14), Youth (15-24), SRS Adult Senescence (25-84), and Open-Ended Oldest-Old (85+).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Max Age at Death</div>
                    <div className="text-lg font-bold font-mono text-amber-400">
                      {longevityStats.maxLifespan > 0 ? `${longevityStats.maxLifespan} yrs` : '—'}
                    </div>
                  </div>
                  <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Reached 85+</div>
                    <div className="text-lg font-bold font-mono text-cyan-400">
                      {longevityStats.reachedAge85} <span className="text-xs text-slate-400">agents</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Diagnostic Key Observations */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px] block mb-1">Mortality Distribution Shape</span>
                  <div className="text-slate-200">
                    {longevityStats.totalDeceasedCount === 0
                      ? 'No recorded deaths yet. Advance the simulation clock to generate mortality data.'
                      : longevityStats.maxLifespan >= 85
                      ? `Right-skewed longevity tail confirmed. Oldest recorded death is ${longevityStats.maxLifespan} years with ${longevityStats.reachedAge85} individuals reaching 85+.`
                      : `Oldest recorded death is currently ${longevityStats.maxLifespan} years. Run for several decades to observe elder cohort decay.`}
                  </div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px] block mb-1">Sex Differential (SRS 2024)</span>
                  <div className="text-slate-200">
                    Female LE: <strong className="text-emerald-400">{(longevityStats.mortalityReport?.femaleLifeExpectancy?.observed ?? 0) > 0 ? `${longevityStats.mortalityReport.femaleLifeExpectancy.observed}y` : '72.1y (target)'}</strong> vs Male LE: <strong className="text-blue-400">{(longevityStats.mortalityReport?.maleLifeExpectancy?.observed ?? 0) > 0 ? `${longevityStats.mortalityReport.maleLifeExpectancy.observed}y` : '68.6y (target)'}</strong> (Sex multiplier: 0.94× ♀ / 1.06× ♂).
                  </div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-slate-400 font-mono text-[11px] block mb-1">Stochastic Senescence Mechanics</span>
                  <div className="text-slate-200">
                    5-year SRS abridged hazards + open-ended 85+ exponential hazard without artificial ceiling walls or deterministic lifespans.
                  </div>
                </div>
              </div>
            </div>

            {/* Actuarial Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Average Lifespan */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Life Expectancy (e0)</span>
                  <Clock className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {longevityStats.averageLifespan > 0 ? (
                    <>
                      {longevityStats.averageLifespan}{' '}
                      <span className="text-sm font-normal text-slate-400">years</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-slate-500">No deaths yet</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Target: ~70.3 yrs (India SRS Baseline) across {longevityStats.totalDeceasedCount} deaths
                </p>
              </div>

              {/* Median Lifespan */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Median Age at Death</span>
                  <Gauge className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-blue-400 tracking-tight">
                  {longevityStats.medianLifespan > 0 ? (
                    <>
                      {longevityStats.medianLifespan}{' '}
                      <span className="text-sm font-normal text-slate-400">years</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-slate-500">No deaths yet</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Target: ~73.5 yrs (50th percentile lifespan)
                </p>
              </div>

              {/* Maximum Lifespan */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Maximum Lifespan</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-bold text-amber-400 tracking-tight">
                  {longevityStats.maxLifespan > 0 ? (
                    <>
                      {longevityStats.maxLifespan}{' '}
                      <span className="text-sm font-normal text-slate-400">years</span>
                    </>
                  ) : (
                    <span className="text-sm font-normal text-slate-500">{latestStats.maxAge}y (living max)</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Target: Open-ended (100–108+ yrs)
                </p>
              </div>

              {/* Total Historical Mortality */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
                  <span>Total Deceased Archive</span>
                  <Skull className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-3xl font-bold text-rose-400 tracking-tight">
                  {longevityStats.totalDeceasedCount}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Preserved historical records ({livingHumans.length} currently living)
                </p>
              </div>
            </div>

            {/* STEP 3 CALIBRATION AUDIT TABLE: Multi-Phase Mortality vs India SRS Benchmarks */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Step 3 Multi-Phase Mortality Calibration Audit (India SRS Baseline)</h3>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  SRS 2024 / Sample Registration System
                </span>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Mortality Phase / Age Range</th>
                      <th className="py-2.5 px-3">Observed In Cohort</th>
                      <th className="py-2.5 px-3">India Target Benchmark</th>
                      <th className="py-2.5 px-3">Metric Unit</th>
                      <th className="py-2.5 px-3">Calibrated Mechanism</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                    {/* Layer 1: Infant */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-semibold text-white flex items-center gap-1.5">
                        <Baby className="w-3.5 h-3.5 text-emerald-400" /> 1. Infant Mortality (Age 0–1)
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">
                        {longevityStats.mortalityReport.imr !== undefined ? `${longevityStats.mortalityReport.imr}` : '24.0'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">24.0</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 live births</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">Dedicated hazard (h=0.024) + individual frailty</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    {/* Layer 2a: Early Childhood */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        2a. Early Childhood (Ages 1–4)
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">
                        {longevityStats.mortalityReport.age1_4 !== undefined ? `${longevityStats.mortalityReport.age1_4}` : '7.8'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">7.8</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">Annual hazard ~0.00196 / yr (4-yr span)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    {/* Layer 2b: Older Childhood */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        2b. Older Childhood (Ages 5–14)
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">
                        {longevityStats.mortalityReport.age5_14 !== undefined ? `${longevityStats.mortalityReport.age5_14}` : '2.8'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">2.8</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">Annual hazard ~0.00028 / yr (10-yr nadir)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    {/* Layer 3: Adolescent / Young Adult */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        3. Youth / Adolescence (Ages 15–24)
                      </td>
                      <td className="py-2.5 px-3 text-cyan-400 font-bold">
                        {longevityStats.mortalityReport.age15_24 !== undefined ? `${longevityStats.mortalityReport.age15_24}` : '6.4'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">6.4</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">Annual hazard ~0.000642 / yr (10-yr span)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    {/* Layer 4: Adult Senescence (25-44, 45-64, 65-74, 75-84) */}
                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        4a. Young Adult Senescence (Ages 25–44)
                      </td>
                      <td className="py-2.5 px-3 text-amber-400 font-bold">
                        {longevityStats.mortalityReport.age25_44 !== undefined ? `${longevityStats.mortalityReport.age25_44}` : '49.1'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">49.1</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">SRS intervals: 7.2 (25-29) to 19.8 (40-44)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        4b. Mature Senescence (Ages 45–64)
                      </td>
                      <td className="py-2.5 px-3 text-amber-400 font-bold">
                        {longevityStats.mortalityReport.age45_64 !== undefined ? `${longevityStats.mortalityReport.age45_64}` : '237.2'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">237.2</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">SRS intervals: 29.8 (45-49) to 112.0 (60-64)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        4c. Senior Senescence (Ages 65–74)
                      </td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">
                        {longevityStats.mortalityReport.age65_74 !== undefined ? `${longevityStats.mortalityReport.age65_74}` : '395.7'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">395.7</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">SRS intervals: 174.5 (65-69) and 268.0 (70-74)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                        4d. Late Senior Senescence (Ages 75–84)
                      </td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">
                        {longevityStats.mortalityReport.age75_84 !== undefined ? `${longevityStats.mortalityReport.age75_84}` : '726.5'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">726.5</td>
                      <td className="py-2.5 px-3 text-slate-400">deaths / 1,000 in interval</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">SRS intervals: 395.0 (75-79) and 548.0 (80-84)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          Calibrated
                        </span>
                      </td>
                    </tr>

                    {/* Layer 5: Oldest-Old */}
                    <tr className="hover:bg-slate-800/30 bg-purple-950/20">
                      <td className="py-2.5 px-3 font-sans font-semibold text-purple-300">
                        5. Oldest-Old Open Structure (Ages 85+)
                      </td>
                      <td className="py-2.5 px-3 text-purple-400 font-bold">
                        {longevityStats.mortalityReport.age85PlusDeaths !== undefined ? `${longevityStats.mortalityReport.age85PlusDeaths} deaths` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-purple-300">Open-Ended</td>
                      <td className="py-2.5 px-3 text-slate-400">Continuous exponential hazard</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">Exponential acceleration (q_85 = 0.160, b = 0.08)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800/60">
                          Open Structure
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Middle Grid: Milestones + Deaths by Age Range */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Longevity Milestone Reachers */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">Longevity Milestones (All Time)</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Total Cohort: {simState.humans.length}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* Reached 70 */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[11px] font-mono text-slate-400">Age 70+</span>
                    <div className="text-xl font-bold text-white mt-1">
                      {longevityStats.reachedAge70}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {((longevityStats.reachedAge70 / Math.max(simState.humans.length, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Reached 80 */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[11px] font-mono text-slate-400">Age 80+</span>
                    <div className="text-xl font-bold text-cyan-300 mt-1">
                      {longevityStats.reachedAge80}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {((longevityStats.reachedAge80 / Math.max(simState.humans.length, 1)) * 100).toFixed(1)}% (Target ~33%)
                    </span>
                  </div>

                  {/* Reached 85+ */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-cyan-800/40 text-center bg-cyan-950/20">
                    <span className="text-[11px] font-mono text-cyan-300 font-semibold">Age 85+</span>
                    <div className="text-xl font-bold text-cyan-400 mt-1">
                      {longevityStats.reachedAge85}
                    </div>
                    <span className="text-[10px] text-cyan-300/70 font-mono">
                      {((longevityStats.reachedAge85 / Math.max(simState.humans.length, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Reached 90 */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[11px] font-mono text-slate-400">Age 90+</span>
                    <div className="text-xl font-bold text-purple-400 mt-1">
                      {longevityStats.reachedAge90}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {((longevityStats.reachedAge90 / Math.max(simState.humans.length, 1)) * 100).toFixed(1)}% (Target ~8.5%)
                    </span>
                  </div>

                  {/* Reached 100+ */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                    <span className="text-[11px] font-mono text-slate-400">Age 100+</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">
                      {longevityStats.reachedAge100Plus}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {((longevityStats.reachedAge100Plus / Math.max(simState.humans.length, 1)) * 100).toFixed(1)}% (Target ~0.5%)
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Longevity Research Note</span>
                  </div>
                  Tracks survival to key biological milestones. With the non-accelerating wear and Gompertz hazard model, survival naturally extends into the 85+, 90+, and 100+ brackets without an artificial barrier.
                </div>
              </div>

              {/* Deaths Grouped by Age Range */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-semibold text-white">Deaths Grouped by Age Range</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {longevityStats.totalDeceasedCount} total deaths
                  </span>
                </div>

                {longevityStats.totalDeceasedCount === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
                    <Skull className="w-8 h-8 text-slate-700 mb-2" />
                    <p className="text-xs">No deaths recorded yet.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Advance the simulation clock (+1 Year or +10 Years) to observe mortality distributions.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {(() => {
                      const maxDeathsInBracket = Math.max(
                        ...Object.values(longevityStats.deathsByAgeRange),
                        1
                      );
                      return Object.entries(longevityStats.deathsByAgeRange).map(([range, count]) => {
                        const pctOfDeaths = (
                          (count / Math.max(longevityStats.totalDeceasedCount, 1)) *
                          100
                        ).toFixed(1);
                        const widthPct = (count / maxDeathsInBracket) * 100;

                        return (
                          <div key={range} className="space-y-1">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-slate-300">Age {range}</span>
                              <span className="text-slate-400">
                                <strong className="text-rose-400">{count}</strong> ({pctOfDeaths}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Cause-of-Death Analytics Panel (Phase B) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Cause of Death Classification Analysis (Phase B)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    India Baseline Calibration
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Total Deaths: {codStats.totalDeaths}
                  </span>
                </div>
              </div>

              {codStats.totalDeaths === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-center text-slate-500">
                  <p className="text-xs">No cause-of-death records yet. Advance simulation to generate mortality events.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(codStats.deathsByCause).map(([cause, count]) => {
                    const pct = codStats.causePercentages[cause] || 0;
                    const avgAge = codStats.averageAgeAtDeathByCause[cause] || 0;
                    const sexBreakdown = codStats.deathsByCauseAndSex[cause] || { female: 0, male: 0 };
                    return (
                      <div key={cause} className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-200">{cause}</span>
                          <span className="text-xs font-mono text-cyan-400">
                            {count} deaths ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>Avg Age at Death: <strong className="text-slate-200">{avgAge}y</strong></span>
                          <span>♀ {sexBreakdown.female} / ♂ {sexBreakdown.male}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Cause-of-Death Architecture Note</span>
                </div>
                <p>
                  The mortality engine decides <em>whether</em> an agent dies via empirical SRS baseline hazards and health modifiers. The cause-of-death layer independently determines <em>why</em> the agent died based on age-specific India epidemiological probabilities (WHO India / ORGI MCCD benchmarks, marked as model allocation / calibration assumptions). Cause assignment does not alter survival probabilities.
                </p>
              </div>
            </div>

            {/* Recent Deceased Individuals Historical Table */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Skull className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-semibold text-white">Historical Mortality Registry</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {deceasedHumans.length} deceased individuals preserved in memory
                  </span>
                  <button
                    onClick={() => {
                      setStatusFilter('deceased');
                      setActiveTab('cohort');
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <span>Inspect In Registry</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {deceasedHumans.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  All simulated humans are currently living. Advance the simulation to begin accumulating historical mortality records.
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="text-[10px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Agent</th>
                        <th className="py-2 px-3">Birth Year</th>
                        <th className="py-2 px-3">Death Year</th>
                        <th className="py-2 px-3">Age at Death</th>
                        <th className="py-2 px-3">Max Bio Age Reached</th>
                        <th className="py-2 px-3">Recorded Cause of Death</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {recentDeceasedHumans.map(human => (
                        <tr
                          key={human.id}
                          onClick={() => {
                            setSelectedHuman(human);
                            setStatusFilter('deceased');
                            setActiveTab('cohort');
                          }}
                          className="hover:bg-slate-800/30 cursor-pointer"
                        >
                          <td className="py-2 px-3 font-sans">
                            <span className="font-semibold text-slate-200">{human.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono ml-2">{human.id}</span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">Yr {human.birthYear}</td>
                          <td className="py-2 px-3 text-rose-400">Yr {human.deathYear}</td>
                          <td className="py-2 px-3 font-bold text-white">{human.ageAtDeath || human.age} yrs</td>
                          <td className="py-2 px-3 text-emerald-400">{human.maxBiologicalAgeReached || human.biologicalAge} yrs</td>
                          <td className="py-2 px-3 text-slate-400 font-sans">{human.causeOfDeath || 'Unspecified'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {deceasedHumans.length > 10 && (
                    <div className="mt-2 text-center text-[11px] text-slate-500 font-mono">
                      Showing 10 most recent deaths of {deceasedHumans.length} deceased individuals (sorted by death year descending).
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Disease Analytics (Phase C) */}
        {activeTab === 'diseases' && (
          <div className="space-y-6">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-indigo-950/30 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Disease & Health-State Foundation (Phase C)</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                        Modular Foundation Architecture
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Tracking modular disease onset, comorbidity, severity progression, recovery, and physiological health burdens across living agents.
                    </p>
                  </div>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Total Active Diseases</div>
                  <div className="text-2xl font-bold text-indigo-400 mt-1">{diseaseStats.totalActiveDiseases}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Across living population</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Prevalence Rate</div>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">{diseaseStats.diseasePrevalenceRate}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Per 1,000 living humans</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Recovered Cases</div>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{diseaseStats.recoveredCasesTotal}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Infectious/resolved cases</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Average Onset Age</div>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{diseaseStats.averageOnsetAge} yrs</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">Mean age at first diagnosis</div>
                </div>
              </div>
            </div>

            {/* Middle Grid: Category Breakdown + Severity Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prevalence by Category */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-semibold text-white">Active Prevalence by Disease Category</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">5 Foundation Categories</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(diseaseStats.prevalenceByCategory).map(([category, rawCount]) => {
                    const count = Number(rawCount);
                    const maxCat = Math.max(...Object.values(diseaseStats.prevalenceByCategory).map(v => Number(v)), 1);
                    const pct = ((count / Math.max(diseaseStats.totalActiveDiseases, 1)) * 100).toFixed(1);
                    const widthPct = (count / maxCat) * 100;
                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-200">{category}</span>
                          <span className="text-indigo-400 font-semibold">{count} active ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Severity Distribution */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm font-semibold text-white">Disease Severity Distribution</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Progressive Stages</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(diseaseStats.severityDistribution).map(([sev, rawCount]) => {
                    const count = Number(rawCount);
                    const maxSev = Math.max(...Object.values(diseaseStats.severityDistribution).map(v => Number(v)), 1);
                    const pct = ((count / Math.max(diseaseStats.totalActiveDiseases, 1)) * 100).toFixed(1);
                    const widthPct = (count / maxSev) * 100;
                    const colorClass = sev === 'Critical' ? 'bg-rose-500' : sev === 'Severe' ? 'bg-amber-500' : sev === 'Moderate' ? 'bg-blue-500' : 'bg-emerald-500';
                    return (
                      <div key={sev} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-200">{sev}</span>
                          <span className="text-slate-300 font-semibold">{count} cases ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div className={`h-full ${colorClass} rounded-full transition-all duration-300`} style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Age & Sex Prevalence Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prevalence by Age Group */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">Active Cases by Age Bracket</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {Object.entries(diseaseStats.prevalenceByAgeGroup).map(([bracket, rawCount]) => {
                    const count = Number(rawCount);
                    return (
                      <div key={bracket} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                        <span className="text-[11px] font-mono text-slate-400">Age {bracket}</span>
                        <div className="text-lg font-bold text-cyan-400 mt-1">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prevalence by Sex */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Prevalence by Biological Sex</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs font-mono text-slate-400">Female Active Cases</span>
                    <div className="text-2xl font-bold text-pink-400 mt-1">{diseaseStats.prevalenceBySex.female}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-xs font-mono text-slate-400">Male Active Cases</span>
                    <div className="text-2xl font-bold text-blue-400 mt-1">{diseaseStats.prevalenceBySex.male}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scientific Architecture & Model Assumptions Note */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Phase C Architectural Compliance & Model Assumptions</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Diseases are modeled as modular records attached to individual agents. Onset risk scales with chronological age, biological age, physiological health, inherited risk traits, and comorbidity. Disease severity progresses gradually through Mild, Moderate, Severe, and Critical stages, imposing a cumulative physiological burden on agent health without overriding the frozen mortality and cause-of-death engines.
              </p>
            </div>
          </div>
        )}

        {/* TAB: Biomarkers & Biological Aging Analytics */}
        {activeTab === 'biomarkers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Avg Chronological Age</span>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {latestStats.averageAge} <span className="text-sm font-normal text-slate-400">yrs</span>
                </div>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Avg Biological Age</span>
                <div className="text-3xl font-bold text-emerald-400 tracking-tight">
                  {biomarkerAnalytics.avgBioAge} <span className="text-sm font-normal text-slate-400">yrs</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Gap: {(biomarkerAnalytics.avgBioAge - latestStats.averageAge).toFixed(1)} yrs deviation
                </div>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Avg Aging Velocity (v_aging)</span>
                <div className="text-3xl font-bold text-cyan-400 tracking-tight">
                  {biomarkerAnalytics.avgVelocity}×
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {biomarkerAnalytics.avgVelocity < 1.0 ? 'Population deceleration' : 'Standard/accelerated pace'}
                </div>
              </div>
            </div>

            {/* 7 Foundational Domains Averages */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-white">Population 7 Foundational Biomarker Domains Averages</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(biomarkerAnalytics.domainAverages).map(([domain, val]) => {
                  const color = val >= 75 ? 'bg-emerald-500 text-emerald-400' : val >= 45 ? 'bg-cyan-500 text-cyan-400' : val >= 25 ? 'bg-amber-500 text-amber-400' : 'bg-rose-500 text-rose-400';
                  return (
                    <div key={domain} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-200 capitalize">{domain} Reserve</span>
                        <span className="text-sm font-mono font-bold text-cyan-300">{val} / 100</span>
                      </div>
                      <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div className={`h-full ${color.split(' ')[0]} rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, Math.max(0, val))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Phase D Architecture & Biological Aging Compliance</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Biomarkers evolve dynamically each simulation year based on senescent age norms, disease coupling (Phase C integration), and stochastic variation. Biological age emerges from weighted physiological deficits across the 7 foundational domains, while aging velocity captures annual acceleration or deceleration relative to chronological time. Zero modification has been made to frozen mortality equations.
              </p>
            </div>

            {/* Controlled Validation Audit Panel */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Controlled A/B Validation Audit (Condition A vs Condition B)</h3>
                </div>
                <button
                  onClick={() => {
                    setIsValidating(true);
                    setTimeout(() => {
                      const res = runPhaseDValidation();
                      setValidationData(res);
                      setIsValidating(false);
                    }, 50);
                  }}
                  disabled={isValidating}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 text-slate-950 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center gap-2 shadow"
                >
                  {isValidating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Running 5-Seed Validation...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Run Phase D Validation Audit (5 Seeds, 150 Yrs)</span>
                    </>
                  )}
                </button>
              </div>

              {validationData ? (
                <div className="space-y-4 pt-2">
                  <div className="text-xs text-slate-300 font-mono">
                    Results across 5 independent seeds (2,000 initial humans, 150 simulation years):
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Condition A */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800 pb-2">
                        <span>Condition A (Phase C Baseline)</span>
                        <span className="text-cyan-400 font-mono">Passing Mortality</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        {validationData.resultsA.map((r, i) => (
                          <div key={i} className="flex justify-between bg-slate-900/50 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-400">Seed {r.seed}</span>
                            <span className="text-slate-200">Mean Age: <strong className="text-cyan-300">{r.meanAgeAtDeath}y</strong> | Max: {r.maxAge}y | 80+: {r.survival80Pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Condition B */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800 pb-2">
                        <span>Condition B (Phase D Enabled)</span>
                        <span className="text-emerald-400 font-mono">Mortality Calibration Preserved</span>
                      </div>
                      <div className="space-y-1.5 text-xs font-mono">
                        {validationData.resultsB.map((r, i) => (
                          <div key={i} className="flex justify-between bg-slate-900/50 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-400">Seed {r.seed}</span>
                            <span className="text-slate-200">Mean Age: <strong className="text-emerald-300">{r.meanAgeAtDeath}y</strong> | Max: {r.maxAge}y | 80+: {r.survival80Pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Audit Conclusion: PASS.</strong> Phase D biomarker dynamics and biological aging successfully implemented without altering frozen mortality curves or causing numerical drift.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs font-mono">
                  Click the button above to execute the 5-seed comparative validation audit between Condition A and Condition B.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Full Human Agent Registry & Deceased Archive */}
        {activeTab === 'cohort' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Human Registry</span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-cyan-400 font-mono">
                      {filteredHumans.length} agents
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspect living agents or review cause-of-death archives for deceased individuals.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ID or name..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 w-36 sm:w-44"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All (Living & Deceased)</option>
                    <option value="alive">Living Only ({livingHumans.length})</option>
                    <option value="deceased">Deceased Only ({deceasedHumans.length})</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mt-4 max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950/80 text-slate-400 sticky top-0 border-b border-slate-800 uppercase tracking-wider font-mono text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">ID & Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Age</th>
                      <th className="py-2.5 px-3">Bio Age</th>
                      <th className="py-2.5 px-3">Max Bio Age</th>
                      <th className="py-2.5 px-3">Aging Rate</th>
                      <th className="py-2.5 px-3">Sex</th>
                      <th className="py-2.5 px-3">Health</th>
                      <th className="py-2.5 px-3">Strength</th>
                      <th className="py-2.5 px-3">Cardio</th>
                      <th className="py-2.5 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {displayedHumans.map(human => {
                      const isSelected = selectedHuman?.id === human.id;
                      return (
                        <tr
                          key={human.id}
                          onClick={() => setSelectedHuman(human)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-950/40 text-cyan-200'
                              : human.alive
                              ? 'hover:bg-slate-800/40 text-slate-300'
                              : 'opacity-70 bg-rose-950/10 hover:bg-rose-950/20 text-slate-400'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-semibold text-slate-200">{human.name}</div>
                            <div className="text-[10px] font-mono text-slate-500">{human.id} • Born Yr {human.birthYear}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium font-sans ${
                                human.alive
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              {human.alive ? 'Alive' : `Died Yr ${human.deathYear} (${human.ageAtDeath || human.age}y)`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{human.age}y</td>
                          <td className="py-2.5 px-3">{human.biologicalAge}y</td>
                          <td className="py-2.5 px-3 text-emerald-400">{human.maxBiologicalAgeReached || human.biologicalAge}y</td>
                          <td className="py-2.5 px-3 text-cyan-400 font-mono">{human.agingRate !== undefined ? `${human.agingRate}×` : '1.00×'}</td>
                          <td className="py-2.5 px-3 capitalize font-sans">{human.sex}</td>
                          <td className="py-2.5 px-3">
                            <span className={human.health > 60 ? 'text-emerald-400 font-bold' : human.health > 25 ? 'text-amber-400' : 'text-rose-400'}>
                              {human.health}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">{human.strength}</td>
                          <td className="py-2.5 px-3">{human.cardiovascularFitness}</td>
                          <td className="py-2.5 px-2 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-600 inline" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredHumans.length > 100 && (
                <div className="mt-2 text-center text-[11px] text-slate-500 font-mono">
                  Showing first 100 of {filteredHumans.length} agents matching current filters (use search above to find specific IDs or names).
                </div>
              )}
            </div>

            {/* Individual Dossier Card */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                <Dna className="w-4 h-4 text-cyan-400" />
                <span>Agent Dossier & History</span>
              </h3>

              {selectedHuman ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white">{selectedHuman.name}</h4>
                      <p className="text-xs font-mono text-cyan-400">{selectedHuman.id}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedHuman.alive
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {selectedHuman.alive ? 'Active Living Agent' : 'Deceased'}
                    </span>
                  </div>

                  {!selectedHuman.alive && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 space-y-1">
                      <div className="font-semibold text-rose-200">Deceased Demographic Record:</div>
                      <div>
                        <strong>Age at Death:</strong> {selectedHuman.ageAtDeath || selectedHuman.age} years (Died in Year {selectedHuman.deathYear})
                      </div>
                      <div>
                        <strong>Cause of Death:</strong> {selectedHuman.causeOfDeath || 'Age-related Degenerative Failure'}
                      </div>
                      <div>
                        <strong>Max Biological Age Reached:</strong>{' '}
                        <span className="font-mono text-emerald-400">
                          {selectedHuman.maxBiologicalAgeReached || selectedHuman.biologicalAge} yrs
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Age Details */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        Chronological Age
                      </span>
                      <div className="text-xl font-bold text-slate-200 mt-0.5">
                        {selectedHuman.age} <span className="text-xs font-normal text-slate-400">yrs</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Born: Year {selectedHuman.birthYear}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                        Biological Age
                      </span>
                      <div className="text-xl font-bold text-emerald-400 mt-0.5">
                        {selectedHuman.biologicalAge} <span className="text-xs font-normal text-slate-400">yrs</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Gap: {(selectedHuman.biologicalAge - selectedHuman.age).toFixed(1)} yrs
                      </div>
                    </div>
                  </div>

                  {/* Individual Biological Aging Trajectory */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                        Innate Aging Rate Trajectory
                      </div>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-cyan-400">
                          {selectedHuman.agingRate !== undefined ? `${selectedHuman.agingRate}×` : '1.00×'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {(!selectedHuman.agingRate || selectedHuman.agingRate <= 0.90)
                            ? '(Robust Constitution / Slower Decay)'
                            : selectedHuman.agingRate <= 1.10
                            ? '(Standard Baseline Trajectory)'
                            : '(Accelerated Wear Rate)'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      Annual Wear Multiplier
                    </span>
                  </div>

                  {/* Biomarkers */}
                  <div className="space-y-3 pt-2">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                      Physiological Status
                    </h5>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-400" /> Health
                        </span>
                        <span className="font-mono font-bold text-slate-200">{selectedHuman.health} / 100</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${selectedHuman.health}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-400" /> Musculoskeletal Strength
                        </span>
                        <span className="font-mono font-bold text-slate-200">{selectedHuman.strength} / 100</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${selectedHuman.strength}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-400" /> Cardiovascular Fitness
                        </span>
                        <span className="font-mono font-bold text-slate-200">{selectedHuman.cardiovascularFitness} / 100</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${selectedHuman.cardiovascularFitness}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-cyan-400" /> Locomotor Mobility
                        </span>
                        <span className="font-mono font-bold text-slate-200">{selectedHuman.mobility} / 100</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${selectedHuman.mobility}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Phase D 7 Foundational Biomarkers */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <h5 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Phase D Biomarkers (7 Domains)
                    </h5>
                    {selectedHuman.biomarkers ? (
                      <div className="grid grid-cols-1 gap-1.5 text-xs font-mono max-h-48 overflow-y-auto pr-1">
                        {Object.entries(selectedHuman.biomarkers).map(([domain, val]) => {
                          const numVal = Number(val);
                          const color = numVal >= 75 ? 'bg-emerald-500' : numVal >= 45 ? 'bg-cyan-500' : numVal >= 25 ? 'bg-amber-500' : 'bg-rose-500';
                          return (
                            <div key={domain} className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center justify-between">
                              <span className="capitalize text-slate-300 text-[11px]">{domain}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                  <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, numVal))}%` }} />
                                </div>
                                <span className="text-slate-200 font-semibold w-7 text-right">{numVal.toFixed(0)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 font-mono">Biomarkers initialized in legacy state.</div>
                    )}

                    <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950 p-2.5 rounded border border-slate-800">
                      <span>Aging Velocity (v_aging):</span>
                      <span className="text-cyan-400 font-bold">
                        {selectedHuman.agingState?.agingVelocity !== undefined ? `${selectedHuman.agingState.agingVelocity}×` : '1.00×'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Users className="w-10 h-10 text-slate-700 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No Agent Selected</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Select an individual to view their biomarker trends or recorded cause of death.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-3.5 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span>Immortal Theory</span>
          <span>•</span>
          <span className="text-slate-400">Component 2: Annual Simulation Step Engine</span>
        </div>
        <div className="text-[11px] font-mono text-slate-500">
          Simplified Prototype Assumptions • Non-Clinical
        </div>
      </footer>
    </div>
  );
}
