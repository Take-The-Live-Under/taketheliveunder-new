# Referee Data Integration - Implementation Plan

## Executive Summary

This document outlines how referee data from RefMetrics has been integrated into the basketball betting model and provides a roadmap for enhancing the homepage display with referee insights.

---

## 1. Model Integration (✅ COMPLETED)

### How Referee Stats Impact Confidence Scoring

The confidence scorer now evaluates referee tendencies and adjusts bet confidence accordingly:

#### Scoring Algorithm

```python
# Tight Referees (40+ fouls/game)
- Base Score: +7 points (favors UNDER)
- Very Tight (45+ fouls/g): Additional +6 points
- Logic: More whistles = more stoppages = slower game = fewer points

# Loose Referees (32- fouls/game)
- Base Score: -7 points (favors OVER)
- Very Loose (30- fouls/g): Additional -6 points
- Logic: Let them play = faster pace = more scoring

# Average Referees (32-40 fouls/game)
- Above Average (38-40): +4 points
- Below Average (34-36): -4 points
- True Average (36-38): Neutral (0 points)
```

#### Maximum Possible Impact
- **Best Case for UNDER**: +13 points (tight crew, 45+ fouls/game)
- **Best Case for OVER**: -13 points (loose crew, 30- fouls/game)
- **Typical Impact**: ±4 to ±7 points (moderate influence)

#### Data Coverage Adjustment
```python
# If we only have stats for 2/3 referees:
final_score = raw_score * (2/3) = raw_score * 0.67

# This ensures partial data doesn't over-influence decisions
```

---

## 2. Current Data Availability

### RefMetrics Dataset
- **Total Referees**: 1,426 in database
- **With Full Stats**: 4 referees
- **Subscription Required**: 1,422 referees ("Subscribe to see")

### Available Referee Data
1. **Christian Watson** - 49.0 fouls/g (Tight, Rank #1)
2. **Bill Daprano** - 47.6 fouls/g (Tight, Rank #2)
3. **James Pate** - 47.0 fouls/g (Tight, Rank #3)
4. **Bill Williams** - 44.5 fouls/g (Tight, Rank #4)

### What This Means
- When these 4 refs officiate: Model gets +7 to +13 confidence boost for UNDER bets
- Other refs: Names shown, but no statistical impact (crew_style: "Unknown")
- **Recommendation**: Consider RefMetrics subscription ($) to unlock full database

---

## 3. Homepage Display Ideas

### Option A: Referee Insights Dashboard (Recommended)

Create a dedicated section showing referee influence on today's games:

```typescript
// Component: RefereeDashboard.tsx

<div className="referee-insights-section">
  <h2>Today's Referee Impact</h2>

  {/* Summary Cards */}
  <div className="ref-impact-cards">
    <Card icon="🔥" label="High Impact Games">
      <span>3 games with known tight crews</span>
      <span className="confidence">Average +8.5 pts to UNDER confidence</span>
    </Card>

    <Card icon="📊" label="Referee Coverage">
      <span>7/21 refs matched in database (33%)</span>
      <ProgressBar value={33} />
    </Card>

    <Card icon="🎯" label="Top Crew Today">
      <span>Christian Watson (49.0 fouls/g)</span>
      <span className="game">Houston vs Syracuse - 6:00 PM</span>
    </Card>
  </div>

  {/* Games with Known Referee Impact */}
  <div className="high-impact-games">
    <h3>Games with Referee Data</h3>
    {games
      .filter(g => g.referee_crew_stats?.found_refs > 0)
      .map(game => (
        <GameCard
          game={game}
          highlight="referee"
          showRefereeImpact={true}
        />
      ))}
  </div>
</div>
```

### Option B: Referee Filter & Sort

Add filter to show only games where referee data boosts confidence:

```typescript
// Filters
const filters = {
  showOnlyRefImpact: boolean,      // Only games with known refs
  minRefConfidence: number,         // Min +/- points from refs
  crewStyle: 'Tight' | 'Loose' | 'All'
}

// Sort options
- By Referee Impact (highest first)
- By Crew Foul Rate (most fouls first)
- By Data Coverage (best matched first)
```

### Option C: Referee Leaderboard

Show top refs by impact on UNDER/OVER outcomes:

```typescript
<RefereeLeaderboard>
  <h3>Top "UNDER" Referees (Most Fouls)</h3>
  <ol>
    <li>
      <span>Christian Watson</span>
      <span>49.0 fouls/g</span>
      <Badge>+13 pts UNDER</Badge>
      <span className="games">9 games</span>
    </li>
    {/* ... */}
  </ol>

  <h3>Top "OVER" Referees (Least Fouls)</h3>
  <ol>
    <li>
      <span>Referee Name</span>
      <span>24.2 fouls/g</span>
      <Badge>+13 pts OVER</Badge>
    </li>
  </ol>
</RefereeLeaderboard>
```

### Option D: Game Card Enhancement (✅ ALREADY DONE)

Each game card now shows referee crew in a collapsible section:
- Referee names
- Crew style (Tight/Average/Loose) with color coding
- Average fouls per game
- Home bias indicator

---

## 4. Recommended Homepage Layout

```
┌────────────────────────────────────────────────┐
│  📊 Live Games Dashboard                       │
├────────────────────────────────────────────────┤
│                                                │
│  🎯 Today's Edge: Referee Analysis             │
│  ┌──────────┬──────────┬──────────┐           │
│  │ 3 Games  │   33%    │ Houston  │           │
│  │ High     │ Coverage │ vs Cuse  │           │
│  │ Impact   │          │ +10 pts  │           │
│  └──────────┴──────────┴──────────┘           │
│                                                │
│  🔥 High-Confidence Plays (with Referee Boost) │
│  ┌────────────────────────────────────────┐   │
│  │  Houston vs Syracuse                   │   │
│  │  💎 85 Confidence (+10 from refs)      │   │
│  │  👔 Christian Watson crew (49 fouls/g) │   │
│  │  ⬇️  UNDER 140.5                       │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  📋 All Live Games                             │
│  [Standard game cards with ref data]          │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 5. Implementation Steps

### Phase 1: Core Display (High Priority)
1. ✅ Add referee section to GameCard (DONE)
2. Create `RefereeSummary` component for dashboard top
3. Add filter: "Show only games with ref data"
4. Highlight referee impact in confidence breakdown

### Phase 2: Analytics (Medium Priority)
5. Create referee leaderboard page
6. Add historical referee performance tracking
7. Show "Ref Impact vs Actual Outcome" analysis
8. Track which ref styles are most predictive

### Phase 3: Advanced Features (Low Priority)
9. Referee alerts (when Christian Watson assigned)
10. Ref-specific betting strategies
11. Compare predicted vs actual fouls per game
12. Referee fatigue analysis (back-to-back games)

---

## 6. Code Locations

### Backend
- **Referee Stats Manager**: `utils/referee_stats.py`
- **Confidence Scorer Integration**: `utils/confidence_scorer.py:811-896`
- **Monitor Integration**: `monitor.py:665-676, 691`
- **API Enrichment**: `api/main.py:358-378`

### Frontend
- **Type Definitions**: `frontend/src/types/game.types.ts:106-131`
- **Game Card Display**: `frontend/src/components/GameCard.tsx:310-380`

### Data
- **Referee CSV**: `data/refmetrics_fouls_2024_25_auth_latest.csv`
- **KenPom Data**: `data/kenpom_data_2026_latest.csv` (future use)

---

## 7. Sample Confidence Breakdown with Referees

```json
{
  "confidence": 87,
  "unit_recommendation": 2.0,
  "breakdown": {
    "base": 50,
    "pace": {
      "home": "Slow pace (65.1): +7",
      "away": "Medium pace (69.1): +3",
      "total": 10
    },
    "defense": {
      "home": "Strong defense (93.3): +6",
      "total": 6
    },
    "fouls": {
      "very_high": "Very high fouls (44): +8",
      "total": 8
    },
    "referee_impact": {
      "found_refs": 3,
      "total_refs": 3,
      "crew_style": "Tight crew (47.7 fouls/g): +7",
      "foul_rate": "Very high foul rate (≥45/g): +6",
      "home_bias": "Neutral: -0.53",
      "coverage": "3/3 refs matched (100% coverage)",
      "total_score": 13.0
    },
    "ppm_severity": 4,
    "total_score": 87
  }
}
```

---

## 8. Testing Checklist

### Backend
- [x] Referee stats manager loads CSV correctly
- [x] Crew stats aggregation works
- [x] Confidence scorer receives referee data
- [x] Monitor.py passes referee stats to scorer
- [ ] Restart monitor and verify referee impact in logs
- [ ] Check live games show referee data in API

### Frontend
- [x] TypeScript types defined
- [x] GameCard displays referee section
- [x] Referee crew stats render correctly
- [ ] Build frontend and verify no errors
- [ ] Test on live games with referees

### Integration
- [ ] End-to-end: ESPN game → Referee stats → Confidence → Display
- [ ] Verify confidence changes with/without referee data
- [ ] Compare games with known refs vs unknown

---

## 9. Future Enhancements

### Data Expansion
- **Subscribe to RefMetrics** to unlock 1,422 additional referees
- **Historical tracking**: Build our own referee database over season
- **Scrape updates**: Auto-fetch new referee assignments daily

### Advanced Analytics
- **Referee-Team combos**: Does Christian Watson call more fouls on Duke?
- **Venue effects**: Home vs away foul differentials by ref
- **Conference bias**: ACC refs vs Big 12 refs
- **Clutch situations**: Do refs swallow whistle in final 2 minutes?

### Machine Learning
- **Predictive model**: Forecast final foul count from referee crew
- **Optimal threshold**: When is ref impact strong enough to override other factors?
- **ROI tracking**: Do referee-boosted bets actually perform better?

---

## 10. Next Steps

1. **Test Current Integration**
   - Restart monitor script
   - Verify referee data flows through system
   - Check confidence scores change appropriately

2. **Create Homepage Components**
   - RefereeSummary dashboard component
   - Filter for ref-impacted games
   - Highlight referee contribution in UI

3. **Gather Feedback**
   - Does referee data improve predictions?
   - Which display format is most useful?
   - Is +13 max impact appropriate or too high?

4. **Iterate & Improve**
   - Adjust referee scoring weights based on results
   - Add more display options
   - Consider RefMetrics subscription

---

**Last Updated**: 2025-11-24
**Status**: Model Integration Complete ✅ | Homepage Display In Progress 🚧
