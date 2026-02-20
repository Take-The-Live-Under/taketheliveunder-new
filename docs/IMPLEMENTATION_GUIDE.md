# Basketball Betting Dashboard - Implementation Guide

## 🎯 Project Status

### ✅ Completed Foundation (3/14 tasks)
1. **Configuration System** (`frontend/src/config/betting.config.ts`)
   - All tunables centralized (trigger thresholds, confidence params, UI colors)
   - College basketball: 40-minute games (2400 seconds)
   - Trigger: RequiredPPM > 4.5 AND TimeRemaining < 29 min

2. **Core Calculations** (`frontend/src/lib/betting-calculations.ts`)
   - `calculateConfidence()` - Logistic curve + time adjustment
   - `calculateMomentum()` - EMA short/long with arrow logic
   - `checkTrigger()` - Trigger rule checker
   - `generateCommentary()` - Deterministic AI commentary
   - All pure functions, fully typed

3. **TypeScript Types** (`frontend/src/types/game.types.ts`)
   - `EnhancedGame` interface with momentum & confidence fields
   - `UserPreferences` for view mode & theme
   - `TelemetryEvent` for tracking

### 🚧 MVP Features (Priority Order)

#### Phase 1: Core Visual Upgrade
- [ ] **Enhanced GameCard Component**
  - Confidence badge with meter (0-100%)
  - AI commentary text
  - Momentum arrow indicator
  - Projected vs O/U pill display
  - Bell icon for alerts

- [ ] **ConfidenceMeter UI Component**
  - Gradient bar visualization
  - Color-coded by tier (LOW/MEDIUM/HIGH/MAX)
  - Side indicator (OVER/UNDER)

- [ ] **Momentum Indicator**
  - Arrow (🔺/🔻/➖)
  - Delta display (+0.18 PPM)

#### Phase 2: Filtering & Alerts
- [ ] **Triggers Sidebar**
  - Auto-filter games meeting trigger rule
  - Quick view/mute actions
  - Count badge

#### Phase 3: Deep Dive
- [ ] **Breakdown Modal**
  - 3 tabs: Scoring, Line Movement, Shooting
  - Annotated charts with zones
  - "Explain This" commentary box

#### Phase 4: Polish
- [ ] Simple/Advanced toggle
- [ ] Dark/Light theme
- [ ] Telemetry logging
- [ ] Unit tests

## 📋 Implementation Checklist

### Next Steps (Do in Order)
1. Create reusable UI components folder structure
2. Build ConfidenceMeter component
3. Build MomentumIndicator component
4. Redesign GameCard with new components
5. Test with live data from API
6. Build TriggersSidebar
7. Deploy to Vercel/Railway for testing

## 🏗️ Architecture

```
frontend/src/
├── config/
│   └── betting.config.ts          ✅ Complete
├── lib/
│   └── betting-calculations.ts    ✅ Complete
├── types/
│   └── game.types.ts              ✅ Complete
├── components/
│   ├── ui/                        🚧 Build next
│   │   ├── ConfidenceMeter.tsx
│   │   ├── MomentumIndicator.tsx
│   │   └── TriggersSidebar.tsx
│   ├── GameCard.tsx               🔄 Redesign
│   └── BreakdownModal.tsx         📋 Future
└── app/
    └── page.tsx                   🔄 Update
```

## 🎨 Design System

### Color Semantics
- **Green** (#10b981): OVER trending, positive momentum
- **Blue** (#3b82f6): UNDER trending
- **Purple** (#a855f7): Line movement
- **Red/Yellow/Green/Emerald**: Confidence tiers

### Confidence Tiers
- **MAX** (86-100%): Emerald - 3 units
- **HIGH** (70-85%): Green - 2 units
- **MEDIUM** (50-69%): Yellow - 1 unit
- **LOW** (0-49%): Red - 0.5 units

## 🚀 Deployment Plan (Low-Cost)

### Frontend - Vercel (FREE)
```bash
cd frontend
vercel --prod
# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

### Backend - Railway ($5/month)
```bash
# Push to GitHub
# Connect Railway to your repo
# Set env vars in Railway:
# ODDS_API_KEY, KENPOM_EMAIL, KENPOM_PASSWORD (if using)
```

### Alternative: Render
- Frontend: Static site (FREE)
- Backend: Web service (FREE tier available)

## 📊 Key Formulas

### Confidence Score
```typescript
base = sigmoid(2.1 * (currentPPM - requiredPPM))
timeAdj = map(timeRemaining, [2400s, 0s], [-0.10, +0.10])
confidence = clamp(base + timeAdj, 0.10, 0.90)
// If triggered: widen to [0.05, 0.95]
```

### Momentum
```typescript
emaShort = avg(last 2 minutes of PPM data)
emaLong = avg(last 6 minutes of PPM data)
arrow = abs(emaShort - emaLong) >= 0.12 ? (emaShort > emaLong ? '🔺' : '🔻') : '➖'
```

### Trigger Rule
```typescript
triggered = requiredPPM > 4.5 && timeRemainingSec < 1740 // 29 min
```

## 🧪 Testing Strategy

### Unit Tests (Jest)
```bash
npm test
```

Test files needed:
- `__tests__/lib/betting-calculations.test.ts`
- `__tests__/components/ConfidenceMeter.test.tsx`

### Manual Testing Checklist
- [ ] Confidence updates correctly as game progresses
- [ ] Momentum arrow changes based on pace shifts
- [ ] Triggers sidebar filters correctly
- [ ] Commentary generates appropriate messages
- [ ] Dark/Light theme toggles properly

## 📝 Usage Example

```typescript
import { calculateConfidence, generateCommentary } from '@/lib/betting-calculations';

// Enhance game data
const enhancedGame = {
  ...rawGame,
  enhancedConfidence: calculateConfidence({
    currentPPM: game.current_ppm,
    requiredPPM: game.required_ppm,
    timeRemainingSec: game.total_time_remaining * 60,
    projectedFinal: game.projected_final_score,
    ouLine: game.ou_line,
    isTriggered: game.trigger_flag,
  }),
  commentary: generateCommentary({
    currentPPM: game.current_ppm,
    ouLine: game.ou_line,
    currentTotal: game.total_points,
    projectedFinal: game.projected_final_score,
    ouLineDiff: game.projected_final_score - game.ou_line,
  }),
};
```

## 🔧 Configuration Tuning

All tunables in `config/betting.config.ts`:
- **Trigger thresholds**: Adjust `minRequiredPPM` and `maxTimeRemainingSec`
- **Confidence curve**: Tweak `logisticA` for steepness
- **Momentum sensitivity**: Change `arrowThreshold`
- **Commentary verbosity**: Adjust thresholds in commentary config

## 📚 Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Next.js Deployment: https://nextjs.org/docs/deployment
- FastAPI Deployment: https://fastapi.tiangolo.com/deployment/

---

**Last Updated**: Session after ESPN closing total integration
**Next Session Goal**: Complete ConfidenceMeter and MomentumIndicator components
