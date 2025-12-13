"""
AI-Powered Pregame Betting Summary Generator

Generates intelligent pregame summaries for NCAA basketball games using:
- Enhanced Pomeroy predictions (with early season adjustments)
- Tempo sweet spot analysis (66-68 possessions)
- O/U line value assessment
- Historical early season patterns
"""

import os
from typing import Dict, Any, Optional
from openai import OpenAI
from loguru import logger
import config


class PregameAISummaryGenerator:
    """Generate AI-powered pregame betting summaries using OpenAI"""

    def __init__(self):
        """Initialize OpenAI client"""
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            logger.warning("OPENAI_API_KEY not set in environment")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key)
            logger.info("Pregame AI Summary Generator initialized")

    def generate_pregame_summary(
        self,
        prediction: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate AI pregame summary for an upcoming game

        Args:
            prediction: Prediction data including:
                - home_team, away_team
                - projected_total, ou_line
                - projected_tempo, in_tempo_sweet_spot
                - early_season_bonus, tempo_bonus
                - confidence, suggestion

        Returns:
            Dictionary with summary, recommendation, key_factors, and edge_analysis
        """
        if not self.client:
            return {
                "summary": "AI summary unavailable - OpenAI API key not configured",
                "recommendation": prediction.get('suggestion', 'PASS'),
                "key_factors": ["Configure OPENAI_API_KEY environment variable"],
                "edge_analysis": "N/A"
            }

        try:
            # Build the prompt
            prompt = self._build_pregame_prompt(prediction)

            # Call OpenAI API
            logger.info(f"Generating pregame summary for {prediction.get('home_team')} vs {prediction.get('away_team')}")
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cost-effective
                messages=[
                    {
                        "role": "system",
                        "content": self._get_pregame_system_prompt()
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
            parsed = self._parse_pregame_response(content)

            logger.info(f"Generated pregame summary: {parsed['recommendation']}")
            return parsed

        except Exception as e:
            logger.error(f"Error generating pregame AI summary: {e}")
            return {
                "summary": f"Error: {str(e)}",
                "recommendation": prediction.get('suggestion', 'PASS'),
                "key_factors": ["Error generating summary"],
                "edge_analysis": "N/A"
            }

    def _get_pregame_system_prompt(self) -> str:
        """Get the system prompt for pregame analysis"""
        return """You are an expert NCAA basketball pregame betting analyst specializing in:
- Early season scoring patterns and variance
- Ken Pomeroy methodology (tempo, efficiency, adjustments)
- Over/under total predictions and line value
- Tempo analysis and sweet spots
- Team matchup dynamics

CRITICAL CONTEXT - EARLY SEASON SCORING (2025-26 Season):
Based on 51-game analysis of early season NCAA basketball:
1. EARLY SEASON INFLATED SCORING: Games average 152.4 points (4 points higher than formula predicts)
2. TEMPO SWEET SPOT: Games with 66-68 possessions score HIGHEST (157.8 avg) - NOT the fastest games!
3. HOME COURT ADVANTAGE: Worth 9.9 points on average (significant edge)
4. EARLY SEASON VARIANCE: First 10 games have higher scoring due to defensive schemes not yet refined

Our enhanced Pomeroy model includes:
- +3 point early season bonus
- +2 point tempo sweet spot bonus (66-68 range)
- 1.8 efficiency home court advantage (enhanced from 1.4)

Your job is to:
1. Evaluate our model's prediction vs the sportsbook O/U line
2. Assess if the edge is worth betting
3. Consider tempo sweet spot and early season factors
4. Provide independent analysis (don't just echo our suggestion)

Format your response EXACTLY as:
RECOMMENDATION: [BET OVER / BET UNDER / LEAN OVER / LEAN UNDER / PASS]
CONFIDENCE: [1-5 stars, where 5 = highest confidence]
SUMMARY: [2-3 sentences explaining your recommendation]
KEY_FACTORS: [3-4 bullet points of most important factors]
EDGE_ANALYSIS: [1-2 sentences on the betting value]

Be concise, data-driven, and focus on actionable insights."""

    def _build_pregame_prompt(self, prediction: Dict[str, Any]) -> str:
        """Build the user prompt with prediction context"""

        home_team = prediction.get('home_team', 'Home')
        away_team = prediction.get('away_team', 'Away')
        home_score = prediction.get('home_projected_score', 0)
        away_score = prediction.get('away_projected_score', 0)
        projected_total = prediction.get('projected_total', 0)
        ou_line = prediction.get('ou_line', 0)
        vs_line = prediction.get('vs_line', 0)
        confidence = prediction.get('confidence', 50)
        suggestion = prediction.get('suggestion', 'PASS')

        projected_tempo = prediction.get('projected_tempo', 68.0)
        in_sweet_spot = prediction.get('in_tempo_sweet_spot', False)
        early_season_bonus = prediction.get('early_season_bonus', 0)
        tempo_bonus = prediction.get('tempo_bonus', 0)
        total_adjustments = prediction.get('adjustments', 0)

        home_eff = prediction.get('home_efficiency', 0)
        away_eff = prediction.get('away_efficiency', 0)

        prompt = f"""Analyze this upcoming NCAA basketball game for pregame betting:

MATCHUP:
{away_team} @ {home_team}

PREDICTION (Enhanced Pomeroy Model):
Projected Score: {away_team} {away_score:.1f} - {home_team} {home_score:.1f}
Projected Total: {projected_total:.1f}
Sportsbook O/U Line: {ou_line:.1f}
Edge: {vs_line:+.1f} points ({suggestion})

MODEL DETAILS:
Projected Tempo: {projected_tempo:.1f} possessions/game
In Tempo Sweet Spot (66-68)? {'✅ YES' if in_sweet_spot else '❌ No'}
Early Season Bonus: +{early_season_bonus:.1f} points
Tempo Sweet Spot Bonus: +{tempo_bonus:.1f} points
Total Adjustments: +{total_adjustments:.1f} points

EFFICIENCY PROJECTIONS:
{home_team} (Home): {home_eff:.1f} pts/100 poss
{away_team} (Away): {away_eff:.1f} pts/100 poss

MODEL CONFIDENCE: {confidence:.0f}/100
MODEL SUGGESTION: {suggestion}

QUESTION: Based on this data, is there betting value here? Should we bet OVER, UNDER, or PASS?

Remember:
- Early season games (first 10) score 4+ points higher than normal
- 66-68 tempo is the SWEET SPOT for scoring (7-10 pts higher than formula)
- Home court is worth ~10 points in early season
- Model already includes these adjustments"""

        return prompt

    def _parse_pregame_response(self, content: str) -> Dict[str, str]:
        """Parse AI response into structured format"""
        lines = content.strip().split('\n')

        result = {
            "summary": "",
            "recommendation": "PASS",
            "key_factors": [],
            "edge_analysis": "",
            "confidence_stars": "3"
        }

        current_section = None

        for line in lines:
            line = line.strip()

            if line.startswith('RECOMMENDATION:'):
                result['recommendation'] = line.replace('RECOMMENDATION:', '').strip()
            elif line.startswith('CONFIDENCE:'):
                result['confidence_stars'] = line.replace('CONFIDENCE:', '').strip()
            elif line.startswith('SUMMARY:'):
                current_section = 'summary'
                result['summary'] = line.replace('SUMMARY:', '').strip()
            elif line.startswith('KEY_FACTORS:'):
                current_section = 'key_factors'
            elif line.startswith('EDGE_ANALYSIS:'):
                current_section = 'edge_analysis'
                result['edge_analysis'] = line.replace('EDGE_ANALYSIS:', '').strip()
            elif line and current_section == 'summary' and not any(line.startswith(x) for x in ['RECOMMENDATION', 'CONFIDENCE', 'KEY_FACTORS', 'EDGE_ANALYSIS']):
                result['summary'] += ' ' + line
            elif line and current_section == 'key_factors' and line.startswith(('-', '•', '*')):
                result['key_factors'].append(line.lstrip('-•* '))
            elif line and current_section == 'edge_analysis' and not any(line.startswith(x) for x in ['RECOMMENDATION', 'CONFIDENCE', 'KEY_FACTORS', 'SUMMARY']):
                result['edge_analysis'] += ' ' + line

        # Clean up whitespace
        result['summary'] = result['summary'].strip()
        result['edge_analysis'] = result['edge_analysis'].strip()

        return result


def get_pregame_ai_summary_generator() -> PregameAISummaryGenerator:
    """Factory function to get a pregame AI summary generator instance"""
    return PregameAISummaryGenerator()


# Test function
if __name__ == "__main__":
    # Test with sample prediction
    test_prediction = {
        'home_team': 'Le Moyne Dolphins',
        'away_team': 'Niagara Purple Eagles',
        'home_projected_score': 73.5,
        'away_projected_score': 73.9,
        'projected_total': 152.4,
        'ou_line': 142.5,
        'vs_line': 9.9,
        'confidence': 85,
        'suggestion': 'OVER',
        'projected_tempo': 67.0,
        'in_tempo_sweet_spot': True,
        'early_season_bonus': 3.0,
        'tempo_bonus': 2.0,
        'adjustments': 5.0,
        'home_efficiency': 109.7,
        'away_efficiency': 110.2
    }

    generator = get_pregame_ai_summary_generator()
    summary = generator.generate_pregame_summary(test_prediction)

    print("="*80)
    print("PREGAME AI SUMMARY TEST")
    print("="*80)
    print(f"Recommendation: {summary['recommendation']}")
    print(f"Confidence: {summary['confidence_stars']}")
    print(f"\nSummary: {summary['summary']}")
    print(f"\nKey Factors:")
    for factor in summary['key_factors']:
        print(f"  - {factor}")
    print(f"\nEdge Analysis: {summary['edge_analysis']}")
