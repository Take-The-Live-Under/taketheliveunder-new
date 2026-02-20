"""
AI-Powered Betting Summary Generator

Uses OpenAI API to generate intelligent, context-aware betting summaries
for live NCAA basketball games based on:
- Current game state (score, time remaining, pace)
- Team statistics and metrics (pace, defense, shooting)
- Confidence scores and betting triggers
- Historical matchup data
"""

import os
import time
from typing import Dict, Any, Optional
from openai import OpenAI
from loguru import logger
import config


class AISummaryGenerator:
    """Generate AI-powered betting summaries using OpenAI"""

    def __init__(self):
        """Initialize OpenAI client and cache"""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            logger.warning("OPENAI_API_KEY not set in environment")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
            logger.info("AI Summary Generator initialized")

        # Cache for AI summaries: {game_id: {interval: summary}}
        self.cache = {}
        self.cache_interval = 300  # 5 minutes in seconds
        self.max_cache_age = 3600  # Keep cache for max 1 hour

    def generate_summary(
        self,
        game_data: Dict[str, Any],
        home_metrics: Optional[Dict[str, Any]] = None,
        away_metrics: Optional[Dict[str, Any]] = None,
        home_live_stats: Optional[Dict[str, Any]] = None,
        away_live_stats: Optional[Dict[str, Any]] = None
    ) -> Dict[str, str]:
        """
        Generate AI betting summary for a game

        Args:
            game_data: Current game state (score, time, odds, etc.)
            home_metrics: Home team season statistics
            away_metrics: Away team season statistics
            home_live_stats: Home team live in-game statistics
            away_live_stats: Away team live in-game statistics

        Returns:
            Dictionary with summary, recommendation, and reasoning
        """
        if not self.client:
            return {
                "summary": "AI summary unavailable - OpenAI API key not configured",
                "recommendation": "PASS",
                "reasoning": "Configure OPENAI_API_KEY environment variable to enable AI summaries"
            }

        # Check cache first
        game_id = game_data.get('game_id', '')
        current_time = time.time()
        interval = int(current_time / self.cache_interval)

        if game_id in self.cache and interval in self.cache[game_id]:
            logger.info(f"Using cached AI summary for {game_id} (interval {interval})")
            return self.cache[game_id][interval]

        try:
            # Build the prompt
            prompt = self._build_prompt(game_data, home_metrics, away_metrics, home_live_stats, away_live_stats)

            # Call OpenAI API
            logger.info(f"Generating new AI summary for {game_id}")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cost-effective
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )

            # Parse response
            content = response.choices[0].message.content
            parsed = self._parse_response(content)

            # Cache the result
            if game_id not in self.cache:
                self.cache[game_id] = {}
            self.cache[game_id][interval] = parsed

            # Clean old cache entries
            self._clean_old_cache(game_id, current_time)

            logger.info(f"Generated and cached AI summary for {game_data.get('away_team')} @ {game_data.get('home_team')}")
            return parsed

        except Exception as e:
            logger.error(f"Error generating AI summary: {e}")
            return {
                "summary": f"Error generating AI summary: {str(e)}",
                "recommendation": "PASS",
                "reasoning": "Unable to generate summary due to API error"
            }

    def _get_system_prompt(self) -> str:
        """Get the system prompt that defines the AI's role"""
        return """You are an expert NCAA basketball betting analyst with deep knowledge of:
- Live in-game betting strategies for over/under totals
- Team pace, efficiency, and defensive metrics
- How game situations affect scoring (halftime adjustments, foul trouble, time management)
- Points Per Minute (PPM) analysis for live totals
- Real-time shooting performance vs season averages

IMPORTANT: You must provide INDEPENDENT analysis. DO NOT simply agree with any system recommendations provided in the data. Analyze the game objectively and form your own conclusion about whether to bet OVER, UNDER, or PASS.

PAY SPECIAL ATTENTION TO LIVE IN-GAME STATS:
1. Shooting Efficiency vs Season Averages - Hot shooting = likely OVER, Cold shooting = likely UNDER
2. Free Throw Rate - Lots of FTs slow the game = favors UNDER
3. Turnover Rate - High turnovers = fewer possessions = favors UNDER
4. Offensive Rebounding - Extra possessions create more scoring = favors OVER
5. Game Flow & Tempo - Clean game with assists = faster pace = favors OVER

Your recommendation should be based on:
- Live shooting percentages compared to season norms
- Actual game flow (fouls, turnovers, pace)
- Time remaining context (late game fouling, blowouts)
- Team tendencies and matchup dynamics

Format your response EXACTLY as:
RECOMMENDATION: [BET UNDER / BET OVER / PASS]
CONFIDENCE: [1-5 stars]
SUMMARY: [2-3 sentences explaining the current situation]
REASONING: [3-4 key factors supporting your recommendation]

Be concise, direct, and focus on the most important factors. No fluff."""

    def _build_prompt(
        self,
        game_data: Dict[str, Any],
        home_metrics: Optional[Dict[str, Any]],
        away_metrics: Optional[Dict[str, Any]],
        home_live_stats: Optional[Dict[str, Any]] = None,
        away_live_stats: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the user prompt with game context"""

        # Extract game state
        away_team = game_data.get('away_team', 'Away')
        home_team = game_data.get('home_team', 'Home')
        away_score = game_data.get('away_score', 0)
        home_score = game_data.get('home_score', 0)
        total_points = game_data.get('total_points', 0)
        period = game_data.get('period', 1)
        minutes_remaining = game_data.get('minutes_remaining', 20)
        ou_line = game_data.get('ou_line', 0)
        required_ppm = game_data.get('required_ppm', 0)
        current_ppm = game_data.get('current_ppm', 0)
        # Note: We intentionally DO NOT extract bet_type - AI should be independent

        # Build prompt (NO PRE-DETERMINED BET TYPE)
        prompt = f"""Analyze this live NCAA basketball game for betting:

GAME STATE:
{away_team} {away_score} @ {home_team} {home_score}
Total Points: {total_points} | Period: {period} | Minutes Left: {minutes_remaining}

BETTING DATA:
Over/Under Line: {ou_line}
Required PPM to hit Over: {required_ppm:.2f}
Current PPM: {current_ppm:.2f}
"""

        # Add live in-game stats if available (PRIORITY - analyze real game flow)
        if home_live_stats or away_live_stats:
            prompt += "\n🔥 LIVE IN-GAME STATS (CURRENT PERFORMANCE):\n"

            if home_live_stats:
                fg_made = home_live_stats.get('fg_made', 0)
                fg_att = home_live_stats.get('fg_attempted', 0)
                fg_pct = home_live_stats.get('fg_pct', 0)
                three_made = home_live_stats.get('three_made', 0)
                three_att = home_live_stats.get('three_attempted', 0)
                three_pct = home_live_stats.get('three_pct', 0)
                ft_made = home_live_stats.get('ft_made', 0)
                ft_att = home_live_stats.get('ft_attempted', 0)
                ft_pct = home_live_stats.get('ft_pct', 0)
                reb_total = home_live_stats.get('rebounds_total', 0)
                reb_off = home_live_stats.get('rebounds_offensive', 0)
                assists = home_live_stats.get('assists', 0)
                turnovers = home_live_stats.get('turnovers', 0)
                fouls = home_live_stats.get('fouls', 0)

                prompt += f"{home_team}:\n"
                prompt += f"  Shooting: {fg_made}/{fg_att} FG ({fg_pct}%), {three_made}/{three_att} 3P ({three_pct}%), {ft_made}/{ft_att} FT ({ft_pct}%)\n"
                prompt += f"  Rebounds: {reb_total} ({reb_off} offensive)\n"
                prompt += f"  Assists: {assists} | Turnovers: {turnovers} | Fouls: {fouls}\n"

            if away_live_stats:
                fg_made = away_live_stats.get('fg_made', 0)
                fg_att = away_live_stats.get('fg_attempted', 0)
                fg_pct = away_live_stats.get('fg_pct', 0)
                three_made = away_live_stats.get('three_made', 0)
                three_att = away_live_stats.get('three_attempted', 0)
                three_pct = away_live_stats.get('three_pct', 0)
                ft_made = away_live_stats.get('ft_made', 0)
                ft_att = away_live_stats.get('ft_attempted', 0)
                ft_pct = away_live_stats.get('ft_pct', 0)
                reb_total = away_live_stats.get('rebounds_total', 0)
                reb_off = away_live_stats.get('rebounds_offensive', 0)
                assists = away_live_stats.get('assists', 0)
                turnovers = away_live_stats.get('turnovers', 0)
                fouls = away_live_stats.get('fouls', 0)

                prompt += f"{away_team}:\n"
                prompt += f"  Shooting: {fg_made}/{fg_att} FG ({fg_pct}%), {three_made}/{three_att} 3P ({three_pct}%), {ft_made}/{ft_att} FT ({ft_pct}%)\n"
                prompt += f"  Rebounds: {reb_total} ({reb_off} offensive)\n"
                prompt += f"  Assists: {assists} | Turnovers: {turnovers} | Fouls: {fouls}\n"

        # Add season team metrics if available
        if home_metrics or away_metrics:
            prompt += "\nSEASON AVERAGES (for comparison):\n"

            if home_metrics:
                prompt += f"{home_team}:\n"
                prompt += f"  Pace (poss/game): {home_metrics.get('pace_per_game', 'N/A')}\n"
                prompt += f"  Season FG%: {home_metrics.get('efg_pct', 'N/A')} (eFG%)\n"
                prompt += f"  Defensive Eff: {home_metrics.get('adj_defensive_efficiency', 'N/A')}\n"
                prompt += f"  3PT Rate: {home_metrics.get('three_point_rate', 'N/A')}\n"
                prompt += f"  FT Rate: {home_metrics.get('free_throw_rate', 'N/A')}\n"

            if away_metrics:
                prompt += f"{away_team}:\n"
                prompt += f"  Pace (poss/game): {away_metrics.get('pace_per_game', 'N/A')}\n"
                prompt += f"  Season FG%: {away_metrics.get('efg_pct', 'N/A')} (eFG%)\n"
                prompt += f"  Defensive Eff: {away_metrics.get('adj_defensive_efficiency', 'N/A')}\n"
                prompt += f"  3PT Rate: {away_metrics.get('three_point_rate', 'N/A')}\n"
                prompt += f"  FT Rate: {away_metrics.get('free_throw_rate', 'N/A')}\n"

        # NEUTRAL QUESTION - no bias toward over or under
        prompt += "\n\nBased ONLY on the data above, should I bet OVER, UNDER, or PASS on this game? Provide your independent analysis focusing on HOW the game is being played right now."

        return prompt

    def _parse_response(self, content: str) -> Dict[str, str]:
        """Parse the AI response into structured format"""
        lines = content.strip().split('\n')

        result = {
            "recommendation": "PASS",
            "confidence": "",
            "summary": "",
            "reasoning": ""
        }

        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            if line.startswith("RECOMMENDATION:"):
                result["recommendation"] = line.split(":", 1)[1].strip()
            elif line.startswith("CONFIDENCE:"):
                result["confidence"] = line.split(":", 1)[1].strip()
            elif line.startswith("SUMMARY:"):
                current_section = "summary"
                result["summary"] = line.split(":", 1)[1].strip()
            elif line.startswith("REASONING:"):
                current_section = "reasoning"
                result["reasoning"] = line.split(":", 1)[1].strip()
            elif current_section == "summary":
                result["summary"] += " " + line
            elif current_section == "reasoning":
                result["reasoning"] += " " + line

        # Combine into a single formatted summary
        full_summary = f"""**{result['recommendation']}** {result['confidence']}

{result['summary']}

**Key Factors:**
{result['reasoning']}"""

        return {
            "summary": full_summary,
            "recommendation": result['recommendation'],
            "reasoning": result['reasoning']
        }

    def _clean_old_cache(self, game_id: str, current_time: float):
        """Remove cache entries older than max_cache_age"""
        if game_id not in self.cache:
            return

        current_interval = int(current_time / self.cache_interval)
        max_intervals_to_keep = int(self.max_cache_age / self.cache_interval)

        # Remove old intervals
        intervals_to_remove = []
        for interval in self.cache[game_id].keys():
            if current_interval - interval > max_intervals_to_keep:
                intervals_to_remove.append(interval)

        for interval in intervals_to_remove:
            del self.cache[game_id][interval]
            logger.debug(f"Removed stale cache for game {game_id}, interval {interval}")

        # Remove game from cache if no intervals left
        if not self.cache[game_id]:
            del self.cache[game_id]
            logger.debug(f"Removed empty cache entry for game {game_id}")


# Singleton instance
_ai_generator = None


def get_ai_summary_generator() -> AISummaryGenerator:
    """Get singleton AI summary generator instance"""
    global _ai_generator
    if _ai_generator is None:
        _ai_generator = AISummaryGenerator()
    return _ai_generator
