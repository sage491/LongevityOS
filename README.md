# Immortal Theory - Longevity Research Simulation

## Project Overview
**Immortal Theory** is an incremental research simulation designed to model how simulated human populations age, survive, reproduce, and ultimately discover or test strategies for extending healthy human lifespan.

> **Research Disclaimer**: All biological equations and biomarker curves currently implemented are **simplified prototype computational assumptions**, not peer-reviewed or clinically validated medical models.

---

## Architectural Principles & Modularity
To ensure that future capabilities (such as genetics, knowledge transmission, research institutions, evolutionary algorithms, and advanced epigenetic aging clocks) can be plugged in seamlessly, the project strictly isolates:
1. **Simulation Domain Types (`src/simulation/types.ts`)**: Pure data structures defining the state of an individual human and population statistics.
2. **Configuration Constants (`src/simulation/constants.ts`)**: Extensible baseline assumptions (initial cohort size, biomarker decay baselines, reproduction windows).
3. **Population Generator (`src/simulation/generator.ts`)**: Deterministic and stochastic initial cohort creation.
4. **Simulation Engine (`src/simulation/engine.ts`)**: The pure step-by-step annual state transition function (advancing time, calculating biological age, evaluating mortality, and births).
5. **Research Dashboard (`src/App.tsx` and UI components)**: Visualization, cohort inspection, parameter controls, and metric tracking.

---

## Foundation Variables (Component 1)
Each simulated individual (`Human`) contains:
- `id`: Unique identifier (string).
- `age`: Chronological age in completed solar years.
- `sex`: Biological sex (`'female' | 'male'`).
- `health`: Normalized general physiological integrity ($0 - 100$).
- `strength`: Musculoskeletal capacity ($0 - 100$).
- `cardiovascularFitness`: Aerobic and circulatory capacity ($0 - 100$).
- `mobility`: Functional joint and locomotor agility ($0 - 100$).
- `biologicalAge`: Estimated functional cellular/tissue age calculated from biomarker deviations relative to chronological age.
- `alive`: Vital state (`true` or `false`).
- `birthYear`: Simulation year of birth.
- `deathYear`: Simulation year of death (or `null` if living).
- `causeOfDeath`: Recorded cause for demographic autopsy analysis.

---

## Roadmap
- [x] **Component 1**: Directory structure, core types, initial population generator (100 humans), prototype testing framework.
- [ ] **Component 2**: The Annual Simulation Step Engine (yearly aging, decay formulas, biological age algorithms).
- [ ] **Component 3**: Demographics Engine (fertility, births, Gompertz-inspired mortality risk model).
- [ ] **Component 4**: Comprehensive Research Dashboard (yearly runs, interactive graphs, cohort filters, data export).
