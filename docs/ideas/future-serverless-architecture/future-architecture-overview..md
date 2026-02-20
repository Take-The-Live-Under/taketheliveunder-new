# TakeTheLiveUnder: System Design Overview

## 1. What We're Building

A system that:

1. Collects data from 4 external sources
2. Trains an ML model on historical data
3. Serves live predictions every 15 seconds during games

---

## 2. The Two Separate Systems

The architecture has two completely independent systems:

### System A: Batch Pipeline

| Aspect         | Details                                           |
| -------------- | ------------------------------------------------- |
| **Purpose**    | Collect historical data, train ML model           |
| **Runs**       | Daily (data collection) + Weekly (model training) |
| **Components** | Lambda, S3, EC2                                   |

### System B: Real-Time Pipeline (Live)

| Aspect         | Details                            |
| -------------- | ---------------------------------- |
| **Purpose**    | Serve predictions to users         |
| **Runs**       | Every 15 seconds during live games |
| **Components** | Lambda, DynamoDB, Neon (Postgres)  |

### Key Insight

- S3 is for storage and training (batch system)
- Live predictions use pre-cached data and pre-loaded models
- Real-time system only calls ESPN + Odds API every 15 seconds
- **Neon** serves as the primary database for live user-facing data

---

## 3. Data Sources

### 3.1 Four External APIs

| Source         | What It Provides                          | Frequency                       | Used For                         |
| -------------- | ----------------------------------------- | ------------------------------- | -------------------------------- |
| **ESPN API**   | Scores, play-by-play, referee assignments | Live: 15 sec, Historical: Daily | Real-time scores + training data |
| **Odds API**   | O/U betting lines                         | Live: 15 sec, Historical: Daily | Real-time lines + training data  |
| **RefMetrics** | Referee foul tendencies                   | Weekly                          | Training + pre-cached lookup     |
| **KenPom**     | Team tempo, efficiency stats              | Daily                           | Training + pre-cached lookup     |

### 3.2 What Gets Called When

| Timing                        | APIs Called              | Purpose                                |
| ----------------------------- | ------------------------ | -------------------------------------- |
| Every 15 seconds (live games) | ESPN + Odds API only     | Get current score and line             |
| Daily at 6 AM                 | ESPN + Odds API + KenPom | Collect historical data, refresh cache |
| Weekly on Sunday              | RefMetrics               | Refresh referee data                   |

---

## 4. Storage Strategy

### 4.1 Three Storage Systems

| Storage          | Type                | Purpose                          |
| ---------------- | ------------------- | -------------------------------- |
| **AWS S3**       | File storage        | Historical data, model artifacts |
| **AWS DynamoDB** | Key-value cache     | Ref tendencies, team stats       |
| **Neon Postgres**| Serverless SQL DB   | Live predictions, trigger logs   |

### 4.2 What Goes Where

| Data                    | Storage  | Reason                              |
| ----------------------- | -------- | ----------------------------------- |
| Raw API responses       | S3       | Cheap archival, debugging           |
| Historical play-by-play | S3       | Training data                       |
| Trained ML model        | S3       | Large file, loaded once             |
| Referee tendencies      | DynamoDB | Fast lookup during live predictions |
| Team KenPom stats       | DynamoDB | Fast lookup during live predictions |
| Team O/U records        | DynamoDB | Fast lookup during live predictions |
| Live predictions        | Neon     | Frontend reads this users           |
| Trigger logs            | Neon     | Historical record of alerts         |

---

## 5. Batch Pipeline (Training)

### 5.1 Data Collection (Daily)

```
6 AM UTC Daily:
    │
    ├── Lambda: Pull yesterday's ESPN play-by-play -> S3
    │
    ├── Lambda: Pull yesterday's Odds lines -> S3
    │
    ├── Lambda: Pull KenPom team stats -> S3 + DynamoDB (cache refresh)
    │
    └── Lambda: Calculate team O/U records -> DynamoDB (cache refresh)


6 AM UTC Weekly (Sunday):
    │
    └── Lambda: Pull RefMetrics data -> S3 + DynamoDB (cache refresh)
```

---

## 6. The Four Data Integration Tasks

### 6.1 Ref Assignment

**Goal:** Connect tonight's referees with their historical foul tendencies

**Data Flow:**

- ESPN gives referee names for tonight's game
- RefMetrics gives historical stats per referee
- Match by referee name
- Store combined data in DynamoDB for real-time lookup

### 6.2 Foul Analysis

**Goal:** Learn how fouls impact game outcomes

**Data Flow:**

- ESPN play-by-play gives foul events per game
- Count total fouls per game
- Compare with game outcome (over/under)
- Find correlation patterns

### 6.3 KenPom Data

**Goal:** Connect team names with their tempo/efficiency stats

**Data Flow:**

- ESPN gives team names for tonight's game
- KenPom gives tempo and efficiency per team
- Match using team name mapping (different naming conventions)
- Store in DynamoDB for real-time lookup

### 6.4 Team O/U

**Goal:** Track each team's over/under record this season

**Data Flow:**

- ESPN gives historical game scores
- Odds API gives historical O/U lines
- Compare each game: did it go over or under?
- Tally per team

---

## 7. Team Name Mapping (Critical)

### The Problem

Each API uses different team names:

| Team | ESPN                     | Odds API            | KenPom         |
| ---- | ------------------------ | ------------------- | -------------- |
| Duke | Duke Blue Devils         | Duke                | Duke           |
| UNC  | North Carolina Tar Heels | North Carolina      | North Carolina |
| USC  | USC Trojans              | Southern California | USC            |

### The Solution

---

## 8. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BATCH SYSTEM                                   │
│                             (Daily/Weekly)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ESPN ─────┐                                                              │
│    Odds API ─┼─-> Lambda ──> S3 (raw) ──> EC2 ──> S3 (model)                │
│    KenPom ───┤              │                                               │
│    RefMetrics┘              │                                               │
│                                                                             │
│                        DynamoDB                                             │
│                    (cache refresh)                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Model deployed to Lambda
                                    │ Cache available in DynamoDB
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REAL TIME SYSTEM                                 │
│                        (Every 15 sec, Live Games)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    ESPN (live) ────┐                                                        │
│                    ├──> Lambda ──> Model (in memory) ──> Neon (Postgres)    │
│    Odds API (live)─┘       |                                                │
│                            │                                                │
│                       DynamoDB                                              │
│                   (cached ref/team data)                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    |
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND DashBoard                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    Polls Neon via Server Actions (Drizzle ORM) every 15s                    │
│    Displays predictions to users                                            │
│    Shows trigger alerts with confidence levels                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Next.js + Drizzle + Neon?

1. **Drizzle ORM**: Provides a type-safe, lightweight way to interact with the database.
2. **Server Actions**: Allows the frontend to query the database securely from the server-side without exposing API keys or needing a separate API Gateway.
3. **Neon (Why is it better?)**:
    - **Architecture Fit**: The design is fully Serverless (AWS Lambda). Neon is built specifically for Serverless. It separates compute from storage, meaning it handles the "thousands of lambda connections" problem naturally without complex pooling setups.
    - **Cost**: Neon **scales to zero**. If no games are running (e.g., 3:00 AM to 6:00 PM), Neon effectively shuts down and costs almost nothing. Supabase usually charges for the instance runtime 24/7.
    - **Simplicity**: It removes the "Vendor Lock-in" ecosystem of Supabase (Edge functions, Auth, Storage) when all we really wanted was a Postgres table.