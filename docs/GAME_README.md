# Basketball Score Predictor Game

A live basketball prediction grid game built as a playable MVP. Predict the final combined score of a basketball game, earn multipliers, and build your streak!

## Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Open in browser
open http://localhost:3000/game
```

## Gameplay Overview

### Objective
Predict the final combined score of a simulated live basketball game. Select tiles on the grid representing different score predictions. Win fuel based on your prediction accuracy!

### Game Flow
1. **Start Game** - Click "Start Game" to begin a 5-minute round
2. **Watch the Score** - The combined score updates every 3 seconds
3. **Make Picks** - Click tiles in the "5 Min 1 Half" column to place predictions
4. **Catch Bonuses** - Random bonus multipliers appear every 20-40 seconds
5. **Settlement** - When time runs out, your picks are settled against the final score

### Scoring System

| Result | Payout |
|--------|--------|
| **Exact Hit** | 100% of (fuel × multiplier) |
| **Within 2 points** | 50% of payout |
| **Within 4 points** | 20% of payout |
| **Miss (>4 points)** | 0 |

### Multipliers
- **Base Multiplier**: Calculated at round start based on statistical likelihood
  - Tiles near expected final score: 1.2x - 1.8x
  - Tiles far from expected: 2.0x - 4.0x
- **Live Boost**: Dynamic boost that increases as game progresses for tiles near current score
- **Random Bonus**: +0.2x to +1.0x applied to all picks made during 10-second bonus window

### Fuel Economy
- **Starting Fuel**: 2,500
- **Pick Cost**: 100 fuel per tile
- **Refunds**: Deselecting a tile refunds the fuel

### Streak System
- Win streak increases by 1 for each round with at least one HIT
- Streak resets to 0 if you make picks but get no HITs
- Display shows fire emoji 🔥 at streak ≥ 3

## Project Structure

```
src/
├── app/
│   └── game/
│       └── page.tsx          # Main game orchestration
├── components/
│   └── game/
│       ├── Header.tsx        # Clock, fuel, streak display
│       ├── BonusBar.tsx      # Slot machine bonus animation
│       ├── Grid.tsx          # Score prediction grid
│       ├── Tile.tsx          # Individual tile component
│       └── ResultsModal.tsx  # End-game results display
└── lib/
    └── gameEngine.ts         # Core game logic & calculations
```

## Game Engine Details

### Score Simulation
- Starting score: 88 (combined)
- Update interval: Every 3 seconds
- Points per update: 0-4 (weighted distribution)
  - 0 points: 10%
  - 1 point: 25%
  - 2 points: 35%
  - 3 points: 20%
  - 4 points: 10%
- Average: ~1.85 points per update

### Expected Final Score Calculation
```typescript
expectedFinal = currentScore + (updatesRemaining × 1.85)
```

### Multiplier Calculation
Distance from expected final determines base multiplier:
- 0-2 points: 1.2x - 1.4x
- 3-4 points: 1.4x - 1.7x
- 5-6 points: 1.6x - 2.0x
- 7-8 points: 1.9x - 2.3x
- 9-10 points: 2.2x - 2.7x
- 11-15 points: 2.6x - 3.2x
- 16+ points: 3.0x - 4.0x

### Bonus System
- Triggers randomly every 20-40 seconds
- Slot machine animation (3 symbols)
- Bonus active for 10 seconds
- Multiplier boost: +0.2x to +1.0x
- Only applies to picks made DURING bonus window

## UI Components

### Header
- **Streak Counter**: Green badge with checkmark
- **Game Clock**: Countdown from 5:00
  - Yellow when < 1:00
  - Red + pulsing when < 0:30
- **Fuel Display**: Yellow lightning bolt icon
- **Live Game Info**: Team names and current score

### Bonus Bar
- Inactive: Gray, shows "Bonus" text
- Spinning: Slot symbols animate
- Active: Gold gradient, countdown timer, shows bonus multiplier

### Grid
- **Y-Axis**: Score values (descending, highest at top)
- **X-Axis**: Two columns
  - "10 Min 1 Half" - Locked/disabled (for future expansion)
  - "5 Min 1 Half" - Active, clickable
- **Tiles**: Show score and multiplier
- **Current Score Indicator**: Yellow dot on left edge
- **Rocket**: Positioned at current score level with flame trail

### Tile States
- **Default**: Dark gray, hover highlights
- **Selected**: Blue with checkmark
- **Boosted**: Orange glow with "+X.x" badge
- **Disabled**: Faded, not clickable

### Results Modal
- Final score display
- Stats: Hits / Near / Miss counts
- Pick-by-pick breakdown with results
- Wagered vs Won summary
- Net profit calculation
- Updated fuel and streak
- "Play Again" button

## Customization

### Adjust Game Duration
In `lib/gameEngine.ts`:
```typescript
export const GAME_DURATION = 300; // Change to desired seconds
```

### Adjust Starting Fuel
```typescript
export const STARTING_FUEL = 2500; // Change starting amount
```

### Adjust Pick Cost
```typescript
export const PICK_COST = 100; // Cost per tile selection
```

### Adjust Bonus Timing
```typescript
export const BONUS_MIN_INTERVAL = 20000; // Minimum ms between bonuses
export const BONUS_MAX_INTERVAL = 40000; // Maximum ms between bonuses
export const BONUS_DURATION = 10000;     // How long bonus lasts
```

### Adjust Score Update Speed
In `app/game/page.tsx`:
```typescript
scoreIntervalRef.current = setInterval(() => {
  // ...
}, 3000); // Change interval in milliseconds
```

## Future Enhancements

- [ ] Integration with live NCAA play-by-play data
- [ ] Sound effects and haptic feedback
- [ ] Leaderboard system
- [ ] Achievement system
- [ ] Multiple game modes (longer rounds, higher stakes)
- [ ] "10 Min 1 Half" column activation
- [ ] Parlay mode (pick multiple games)
- [ ] Social features (share wins)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useEffect, useRef)
- **No External Backend**: All simulation runs client-side

## License

MIT - Feel free to use, modify, and distribute.

---

Built as a vertical slice MVP demo. Not for production gambling use.
