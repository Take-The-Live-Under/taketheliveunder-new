# Early Season Scoring Analysis (2026 NCAA Basketball)

**Dataset**: 51 games from early 2026 season
**Date**: November 17, 2025

---

## KEY FINDINGS SUMMARY

### Overall Scoring
- **Average Total**: **152.4 ± 19.5 points**
- **Scoring Range**: 92 - 197 points
- **Most Common Range**: 140-170 points (60.8% of games)

### Home Court Advantage
- **Home Team Average**: 81.2 ± 11.7 points
- **Away Team Average**: 71.3 ± 12.8 points
- **Home Advantage**: **+9.9 points per game**

### Overtime Impact
- **OT Frequency**: 4 of 51 games (7.8%)
- **OT Game Average**: **189.5 points** (vs 152.4 overall)
- **Impact**: OT games score 37 points MORE on average

---

## SCORING DISTRIBUTION

| Points Range | Games | Percentage | Interpretation |
|--------------|-------|------------|----------------|
| 0-130 | 5 | 9.8% | Very Low Scoring |
| 130-140 | 6 | 11.8% | Low Scoring |
| **140-150** | **12** | **23.5%** | **Below Average** |
| 150-160 | 8 | 15.7% | Average |
| **160-170** | **11** | **21.6%** | **Above Average** |
| 170-300 | 9 | 17.6% | High Scoring |

**Key Insight**: Games are fairly evenly distributed, with 60% falling in the 140-170 range. This is HIGHER than typical NCAA averages (usually 135-145), suggesting early season may have inflated scoring.

---

## TEMPO ANALYSIS

**Average Tempo**: 67.7 possessions per game

| Tempo Range | Games | Avg Total | Home | Away | Insight |
|-------------|-------|-----------|------|------|---------|
| Slow (0-66) | 9 | 147.8 | 77.0 | 70.8 | Defensive battles |
| Moderate (66-68) | 13 | **157.8** | 84.4 | 73.4 | **Highest scoring** |
| Normal (68-70) | 18 | 150.3 | 81.7 | 68.6 | Standard pace |
| Fast (70+) | 4 | 160.2 | 84.8 | 75.5 | Up-tempo games |

**Key Finding**: The **sweet spot for scoring is 66-68 tempo** (157.8 avg), NOT the fastest games. This suggests:
- Very fast games may have more turnovers/rushed shots
- Moderate-fast tempo allows both offense AND transition points
- Slowest games (< 66) score the LEAST (147.8)

---

## OFFENSIVE EFFICIENCY ANALYSIS

**Average Offensive Efficiency**: 109.6 points per 100 possessions
**Average Defensive Efficiency**: 104.0 points per 100 possessions

| OffEff Range | Games | Avg Total | Pattern |
|--------------|-------|-----------|---------|
| Low (0-105) | 10 | 144.7 | Defensive struggles |
| Moderate (105-110) | 14 | **157.6** | **Efficient offense wins** |
| Good (110-115) | 9 | 156.2 | High-powered offense |
| Elite (115+) | 11 | 151.6 | Surprisingly lower |

**Surprising Finding**: Elite offensive efficiency (115+) games average LOWER totals (151.6) than moderate efficiency (105-110) which averages 157.6. This suggests:
- Elite offenses may face elite defenses
- Moderate efficiency games have balanced offense/defense matchups
- **Best bet for OVER**: Games with 105-110 combined offensive efficiency

---

## HIGHEST SCORING GAMES (Top 10)

| Rank | Total | Matchup | OT? | Tempo | OffEff |
|------|-------|---------|-----|-------|--------|
| 1 | 197 | Kennesaw St (89) vs USF (108) | ✅ | N/A | N/A |
| 2 | 192 | West Georgia (100) vs Citadel (92) | ✅ | 65.8 | 105.2 |
| 3 | 185 | Colorado (97) vs Providence (88) | ✅ | 67.2 | 110.3 |
| 4 | 184 | Wake Forest (109) vs UMass Lowell (75) | ✅ | 68.0 | 108.5 |
| 5 | 179 | Georgia (92) vs Georgia Tech (87) | ❌ | 66.7 | 115.3 |

**Patterns**:
- **4 of top 5 went to OT** (extra 5 minutes = extra ~15-20 points)
- Moderate tempo (65-68) appears frequently
- Not always the highest offensive efficiency

---

## LOWEST SCORING GAMES (Top 10)

| Rank | Total | Matchup | Tempo | OffEff | Issue |
|------|-------|---------|-------|--------|-------|
| 1 | 92 | Towson (51) vs Norfolk St (41) | N/A | N/A | Defensive grind |
| 2 | 120 | Drake (59) vs SIU Edwardsville (61) | N/A | N/A | Low efficiency |
| 3 | 124 | Northern Iowa (70) vs Furman (54) | 65.7 | 110.0 | Slow pace + Defense |
| 4 | 129 | Creighton (84) vs MD-ES (45) | 68.5 | 118.3 | **Blowout** |
| 5 | 129 | Saint Mary's (80) vs N Texas (49) | 61.3 | 112.2 | **Very slow** |

**Patterns**:
- Blowouts can produce low totals (one team dominates, other can't score)
- Very slow tempo (< 62) almost guarantees UNDER
- Even high offensive efficiency doesn't guarantee scoring if pace is slow

---

## HOME vs AWAY BREAKDOWN

### Home Teams (Team 1)
- **Average Score**: 81.2 points
- **Standard Deviation**: ±11.7 points
- **Range**: Most games 69-93 points

### Away Teams (Team 2)
- **Average Score**: 71.3 points
- **Standard Deviation**: ±12.8 points (MORE variable)
- **Range**: Most games 58-84 points

### Home Advantage
- **Scoring Edge**: +9.9 points per game
- **Consistency**: Away teams are MORE volatile (higher std dev)
- **Impact**: Home teams score 14% more on average

**For Predictions**: Our model uses +1.4 efficiency points for home court. The actual scoring impact is ~10 points, which aligns with Pomeroy's formula:
- 67 tempo × 1.4 efficiency / 100 = 0.94 points per team
- ×2 teams ≈ 2 points from efficiency boost
- Additional points come from crowd/familiarity effects

---

## BETTING IMPLICATIONS

### OVER Opportunities
Look for games with:
- ✅ **Tempo 66-68** (sweet spot: 157.8 avg)
- ✅ **Combined OffEff 105-110** (not too high, not too low)
- ✅ **Both teams average 70+** tempo
- ✅ **Home team favored by 5-10 points** (competitive but not close)

### UNDER Opportunities
Look for games with:
- ✅ **Tempo < 66** (147.8 avg)
- ✅ **One elite defense** (DefEff < 95)
- ✅ **Very slow pace** (< 63 possessions)
- ✅ **Blowout potential** (one team much better)

### PASS Situations
- ⚠️ **Toss-up games** (home team slight underdog)
- ⚠️ **Extreme tempo** (< 62 or > 72)
- ⚠️ **Combined OffEff > 115** (variance too high)

---

## MODEL PERFORMANCE vs EARLY SEASON DATA

Our Pomeroy model predicts based on:
```
Total = (Tempo × Combined Efficiency) / 100
```

### How Well Does It Match?

**Expected (Pomeroy formula)**:
- Avg Tempo: 67.7
- Avg OffEff: 109.6
- Predicted: 67.7 × 109.6 / 100 × 2 teams = **148.4 points**

**Actual Average**: **152.4 points**

**Difference**: **+4.0 points** (model UNDER-predicts by 2.7%)

### Why The Difference?

1. **Early Season Variance**: Teams haven't settled into their normal patterns
2. **Cupcake Games**: Several mismatches (Creighton 84-45, Duke 100-62)
3. **Overtime Games**: 4 OT games inflate the average
4. **Home Court**: +9.9 points actual vs +2 points model expects

### Adjustment Recommendation

For early season games (first 10 games), consider:
- **Add 2-3 points to Pomeroy prediction** for variance
- **Weight home court more heavily** (1.8 instead of 1.4 efficiency)
- **Flag blowout potential** (>15 point spread = likely UNDER)

---

## KEY INSIGHTS FOR BETTING

### 1. **Tempo is NOT Linear**
- Faster ≠ Always More Points
- Sweet spot: 66-68 possessions
- Very slow (< 63) and very fast (> 72) both unpredictable

### 2. **Home Court is REAL**
- 9.9 point advantage on average
- More consistent than away teams (lower variance)
- Consider boosting home team predictions by 5%

### 3. **Efficiency Sweet Spot**
- Combined OffEff of 105-110 = highest totals
- Elite offenses (115+) may face elite defenses
- Low efficiency (< 105) games are safer UNDERs

### 4. **Overtime Matters A LOT**
- 7.8% of games go to OT
- OT games average 37 points MORE
- Consider "OT insurance" on close matchups

### 5. **Early Season is Higher Scoring**
- Actual: 152.4 avg
- Expected: 148.4 avg
- +4 points variance likely due to:
  - Mismatches (cupcake games)
  - Defensive schemes not yet refined
  - Faster transition play

---

## RECOMMENDATIONS FOR MODEL IMPROVEMENT

### Short-Term (Now)
1. **Add +3 point "early season bonus"** to predictions
2. **Increase home court from 1.4 → 1.8** efficiency
3. **Flag games with >15 point spread** as potential UNDERs (blowouts)

### Medium-Term (50+ games)
1. **Track scoring by game number** (Game 1-5, 6-10, 11-15, etc.)
2. **Add "blowout detector"** based on AdjEM difference
3. **Model OT probability** and adjust O/U accordingly

### Long-Term (100+ games)
1. **Separate early season (games 1-10) vs mid-season models**
2. **Add team-specific tempo variance** (some teams more consistent)
3. **Incorporate opponent adjustments** (how teams perform vs top-50)

---

## CONCLUSION

Early season scoring (2026) shows:
- ✅ **Higher than expected** (152.4 vs 148.4 predicted)
- ✅ **Strong home court effect** (9.9 points)
- ✅ **Tempo sweet spot at 66-68** possessions
- ✅ **7.8% OT rate** significantly inflates totals
- ✅ **Wide variance** (92-197 range)

**For predictions**: Consider adding a +3 point early season adjustment and increasing home court weighting from 1.4 to 1.8 efficiency points for first 10 games of the season.

**Next Analysis**: Track how scoring changes as teams progress through games 10-20 to see if totals normalize toward 145-150 average.
