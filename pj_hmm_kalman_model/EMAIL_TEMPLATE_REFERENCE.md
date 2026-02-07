# Take The Live Under - NCAA Daily Summary Template

**For Discord** (messages split to stay under 2000 char limit)

---

## 📊 YESTERDAY'S SNAPSHOT

| Metric | Value |
|--------|-------|
| Total NCAA games tracked | [X] |
| Games going under ~140 total | [X] ([%]) |
| Average combined score | [X] |
| Games with "Slow" regime dominant | [X] |

---

## 🚨 4.5 PPM TRIGGER ALERTS

Games where required PPM exceeded our 4.5 threshold (core under signal):

### Individual Triggers

| Game | Triggered At | Max PPM | O/U Line | Final | Result |
|------|--------------|---------|----------|-------|--------|
| [Away] @ [Home] | [min] min (PPM [X.XX]) | [X.XX] at min [X] | [line] | [total] | ✅ UNDER / ❌ OVER |

### PPM Trigger Performance Summary

| PPM Range | Games | Unders Hit | Win Rate |
|-----------|-------|------------|----------|
| 4.5 - 5.0 | [X] | [X] | [X]% |
| 5.0 - 5.5 | [X] | [X] | [X]% |
| 5.5+ | [X] | [X] | [X]% |
| **Total** | **[X]** | **[X]** | **[X]%** |

**Trigger Success Rate**: [X/Y] ([%]) of triggered games hit under

---

## ✅ UNDER WINNERS (Low-Scoring Games < 135 total)

For each low-scoring game:

**[Away] @ [Home]**: [Score] (Total: [X])
- **Dominant Regime**: [Slow/Normal/Fast]
- **Team Paces**: [Home pace category] vs [Away pace category]
- **Key Factor**: [Why it went under - e.g., "Both slow-pace teams, dominant defense in 2nd half"]

---

## 🎯 MODEL VALIDATION

### Projection Accuracy
| Metric | Value |
|--------|-------|
| Games projected | [X] |
| Mean Absolute Error | [X.X] points |
| Projections within 5 pts | [X]% |

### Regime Detection Accuracy
- HMM correctly identified dominant regime in [X]% of games
- Slow regime games went under at [X]% rate
- Fast regime games went over at [X]% rate

### Signal Performance
| Signal Type | Count | Win Rate |
|-------------|-------|----------|
| High Confidence (80+) | [X] | [X]% |
| Medium Confidence (60-79) | [X] | [X]% |
| Low Confidence (50-59) | [X] | [X]% |

---

## 🐢 SLOW PACE HIGHLIGHTS

### Teams Playing Notably Slow
| Team | Season Avg PPM | Yesterday's PPM | Deviation |
|------|----------------|-----------------|-----------|
| [Team] | [X.XX] | [X.XX] | -[X.XX] |

### Extended Slow Regime Games
Games with 15+ consecutive minutes in "Slow" regime:
- [Away] @ [Home]: [X] minutes in Slow regime (minutes [X]-[X])

### Defensive Standouts
- [Team]: Held opponent to [X] points ([X] below their average)

---

## 📈 PATTERNS & INSIGHTS

### Conference Trends
| Conference | Games | Under Rate | Avg Total |
|------------|-------|------------|-----------|
| [Conf] | [X] | [X]% | [X] |

### Time of Day
| Tip Time | Games | Under Rate |
|----------|-------|------------|
| Early (12-3pm) | [X] | [X]% |
| Afternoon (3-6pm) | [X] | [X]% |
| Evening (6-9pm) | [X] | [X]% |
| Late (9pm+) | [X] | [X]% |

### Home vs Away
- Home team scoring below average: [X] games
- Away team scoring below average: [X] games

### Consistent Under Teams (Last 5 Games)
| Team | Under Streak | Avg Total |
|------|--------------|-----------|
| [Team] | [X] games | [X] |

---

## 🔮 TODAY'S WATCH LIST

Games that favor the under based on our model:

### Strong Under Leans (Both Slow Pace)

**[Away] @ [Home]** - [Time] ET
- **Matchup Type**: Both Slow
- **Expected Total**: [X] (vs typical line ~[X])
- **Model Confidence**: [X]%
- **Key Factor**: [Reason]

### Moderate Under Leans

**[Away] @ [Home]** - [Time] ET
- **Matchup Type**: [Type]
- **Expected Total**: [X]
- **Model Confidence**: [X]%
- **Watch For**: PPM trigger if game starts slow

---

## 📊 SEASON-TO-DATE PERFORMANCE

| Metric | Value |
|--------|-------|
| Total games tracked | [X] |
| 4.5+ PPM triggers | [X] |
| Trigger win rate | [X]% |
| Model projection MAE | [X.X] pts |
| High-confidence signal ROI | +[X.X]% |

---

*Take the Live Under | Where the math meets the market*
*taketheliveunder.com*

---

# Notes for Implementation

## Data Sources Required

1. **Live Monitor Logs** (`/Users/brookssawyer/Desktop/basketball-betting/data/`):
   - `ncaa_live_log.csv` - PPM triggers, confidence scores
   - `ncaa_results.csv` - Final game results with O/U outcomes

2. **PJ Model Outputs** (`pj_hmm_kalman_model/outputs/`):
   - `season_game_summaries_*.csv` - Full game data with projections
   - `betting_signals_*.csv` - Generated signals
   - `team_profiles_*.csv` - Team pace/variance profiles

3. **External Data**:
   - ESPN NCAA Basketball scores (via web search)
   - Historical O/U lines if available

## Key Calculations

### 4.5 PPM Trigger
```
Required PPM = (O/U Line - Current Total) / Minutes Remaining
Trigger fires when: Required PPM >= 4.5
```

### Win Rate
```
Win Rate = Unders Hit / Total Triggers × 100
```

### ROI Calculation
```
ROI = (Total Won - Total Wagered) / Total Wagered × 100
Assuming -110 odds: Win pays 0.909 units, Loss costs 1.0 units
```

## Discord Webhook

**Webhook URL**: `https://discord.com/api/webhooks/1467008530811977822/yH6a1cIVfXerwCIeBZwSD6lbhutMGZPm1q96t_hspaRL2wscsOBJClNAxPxXspf8Sn_O`

**Sending via Python**:
```python
import requests

WEBHOOK_URL = 'https://discord.com/api/webhooks/1467008530811977822/yH6a1cIVfXerwCIeBZwSD6lbhutMGZPm1q96t_hspaRL2wscsOBJClNAxPxXspf8Sn_O'

def send_discord(content):
    response = requests.post(WEBHOOK_URL, json={'content': content})
    return response.status_code == 204  # Success
```

**Notes**:
- 2000 character limit per message (split into multiple)
- Add 1-second delay between messages to avoid rate limits
- HTTP 204 = success (no response body)
