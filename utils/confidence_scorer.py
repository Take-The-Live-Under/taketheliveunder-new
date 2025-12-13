"""
Smart Confidence Scoring Algorithm
Analyzes team stats and matchup dynamics to calculate bet confidence
"""
from typing import Dict, Optional, Tuple
from loguru import logger
import config


class ConfidenceScorer:
    """
    Calculates confidence scores (0-100) for over OR under bets
    based on team statistics and matchup characteristics.
    BALANCED - Symmetric scoring for both bet types.
    """

    def __init__(self, custom_weights: Optional[Dict] = None):
        """
        Initialize scorer with weights

        Args:
            custom_weights: Optional dict to override default weights from config
        """
        self.weights = custom_weights or config.CONFIDENCE_WEIGHTS

    def calculate_confidence(
        self,
        home_metrics: Dict,
        away_metrics: Dict,
        required_ppm: float,
        current_total: int,
        ou_line: float,
        bet_type: Optional[str] = "under",
        current_ppm: Optional[float] = 0,
        home_fouls: Optional[int] = None,
        away_fouls: Optional[int] = None,
        home_live_stats: Optional[Dict] = None,
        away_live_stats: Optional[Dict] = None,
        referee_crew_stats: Optional[Dict] = None
    ) -> Dict:
        """
        Calculate confidence score for over or under bet

        Args:
            home_metrics: Home team season statistical metrics
            away_metrics: Away team season statistical metrics
            required_ppm: Required points per minute to hit over
            current_total: Current total points scored
            ou_line: Over/under line
            bet_type: "over" or "under" (default: "under")
            current_ppm: Current scoring pace (points per minute elapsed)
            home_fouls: Home team fouls (from live stats)
            away_fouls: Away team fouls (from live stats)
            home_live_stats: Home team live in-game statistics
            away_live_stats: Away team live in-game statistics

        Returns:
            Dict with:
            - confidence: Score 0-100
            - unit_recommendation: 0, 0.5, 1, 2, or 3
            - breakdown: Dict explaining the score
        """
        # Determine scoring multiplier (inverse logic for OVER bets)
        # For UNDER: positive scores for factors favoring under
        # For OVER: flip the sign (fast pace becomes positive, slow becomes negative)
        multiplier = -1 if bet_type == "over" else 1

        # Base score: trigger already met
        score = 50
        breakdown = {"base": 50, "bet_type": bet_type or "under"}

        # Only proceed if metrics exist for both teams
        if not home_metrics or not away_metrics:
            logger.warning("Missing team metrics for confidence calculation")
            return {
                "confidence": 0,
                "unit_recommendation": 0,
                "breakdown": {"error": "Missing team data"}
            }

        # === PACE ANALYSIS ===
        # For UNDER: slow pace is good (positive score)
        # For OVER: fast pace is good (multiplier flips the score)
        pace_score, pace_breakdown = self._evaluate_pace(home_metrics, away_metrics)
        score += pace_score * multiplier
        breakdown["pace"] = pace_breakdown

        # === 3-POINT ANALYSIS ===
        # For UNDER: low 3P shooting is good
        # For OVER: high 3P shooting is good
        three_score, three_breakdown = self._evaluate_three_point(home_metrics, away_metrics)
        score += three_score * multiplier
        breakdown["three_point"] = three_breakdown

        # === FREE THROW ANALYSIS ===
        # For UNDER: low FT rate is good (fewer points, stops clock less)
        # For OVER: high FT rate is good (more points)
        ft_score, ft_breakdown = self._evaluate_free_throws(home_metrics, away_metrics)
        score += ft_score * multiplier
        breakdown["free_throw"] = ft_breakdown

        # === TURNOVER ANALYSIS ===
        # For UNDER: high TO is good (fewer possessions)
        # For OVER: low TO is good (more possessions)
        to_score, to_breakdown = self._evaluate_turnovers(home_metrics, away_metrics)
        score += to_score * multiplier
        breakdown["turnover"] = to_breakdown

        # === DEFENSE ANALYSIS ===
        # For UNDER: strong defense is good
        # For OVER: weak defense is good
        def_score, def_breakdown = self._evaluate_defense(home_metrics, away_metrics)
        score += def_score * multiplier
        breakdown["defense"] = def_breakdown

        # === FOUL ANALYSIS ===
        # For UNDER: high fouls is good (more stoppages, slower game)
        # For OVER: low fouls is good (game flows faster)
        foul_score, foul_breakdown = self._evaluate_fouls(home_fouls, away_fouls)
        score += foul_score * multiplier
        breakdown["fouls"] = foul_breakdown

        # === MATCHUP BONUSES ===
        # For UNDER: both slow-paced teams, both strong defense
        # For OVER: both fast-paced teams, both weak defense
        matchup_score, matchup_breakdown = self._evaluate_matchup(home_metrics, away_metrics)
        score += matchup_score * multiplier
        breakdown["matchup"] = matchup_breakdown

        # === NEW PHASE 2 ANALYSIS ===
        # Assists analysis
        assists_score, assists_breakdown = self._evaluate_assists(home_metrics, away_metrics)
        score += assists_score * multiplier
        breakdown["assists"] = assists_breakdown

        # Assist-to-Turnover ratio analysis
        ast_to_score, ast_to_breakdown = self._evaluate_ast_to_ratio(home_metrics, away_metrics)
        score += ast_to_score * multiplier
        breakdown["ast_to_ratio"] = ast_to_breakdown

        # Steals analysis
        steals_score, steals_breakdown = self._evaluate_steals(home_metrics, away_metrics)
        score += steals_score * multiplier
        breakdown["steals"] = steals_breakdown

        # Blocks analysis
        blocks_score, blocks_breakdown = self._evaluate_blocks(home_metrics, away_metrics)
        score += blocks_score * multiplier
        breakdown["blocks"] = blocks_breakdown

        # Rebounding analysis
        rebounding_score, rebounding_breakdown = self._evaluate_rebounding(home_metrics, away_metrics)
        score += rebounding_score * multiplier
        breakdown["rebounding"] = rebounding_breakdown

        # === PPM/PACE ANALYSIS ===
        # Different logic for OVER vs UNDER
        if bet_type == "over":
            # For OVER: high current PPM is good, low required PPM is good
            ppm_score = self._evaluate_over_pace(required_ppm, current_ppm)
        else:
            # For UNDER: high required PPM is good (need to score fast)
            ppm_score = self._evaluate_ppm_severity(required_ppm)
        score += ppm_score
        breakdown["ppm_severity"] = ppm_score

        # === LIVE STATS ANALYSIS (if available) ===
        # Adjust confidence based on real-time game performance
        if home_live_stats or away_live_stats:
            # Shooting efficiency vs expectations
            shooting_score, shooting_breakdown = self._evaluate_live_shooting(
                home_metrics, away_metrics, home_live_stats, away_live_stats
            )
            score += shooting_score * multiplier
            breakdown["live_shooting"] = shooting_breakdown

            # Free throw impact on game flow
            ft_impact_score, ft_impact_breakdown = self._evaluate_live_ft_impact(
                home_live_stats, away_live_stats
            )
            score += ft_impact_score * multiplier
            breakdown["live_ft_impact"] = ft_impact_breakdown

            # Turnover rate affecting possessions
            to_impact_score, to_impact_breakdown = self._evaluate_live_turnovers(
                home_live_stats, away_live_stats
            )
            score += to_impact_score * multiplier
            breakdown["live_turnovers"] = to_impact_breakdown

            # Rebounding battle
            reb_score, reb_breakdown = self._evaluate_live_rebounding(
                home_live_stats, away_live_stats
            )
            score += reb_score * multiplier
            breakdown["live_rebounding"] = reb_breakdown

        # === REFEREE CREW ANALYSIS (if available) ===
        # Adjust confidence based on referee tendencies
        if referee_crew_stats and referee_crew_stats.get("found_refs", 0) > 0:
            ref_score, ref_breakdown = self._evaluate_referee_impact(referee_crew_stats)
            score += ref_score * multiplier
            breakdown["referee_impact"] = ref_breakdown

        # Cap score at 0-100
        final_score = max(0, min(100, score))

        # Determine unit recommendation
        unit_recommendation = self._get_unit_recommendation(final_score)

        breakdown["total_score"] = score
        breakdown["final_score"] = final_score

        return {
            "confidence": final_score,
            "unit_recommendation": unit_recommendation,
            "breakdown": breakdown
        }

    def _evaluate_pace(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate pace/tempo for both teams"""
        score = 0
        details = {}

        home_pace = home.get("pace_per_game", home.get("pace", 70))
        away_pace = away.get("pace_per_game", away.get("pace", 70))

        slow_threshold = self.weights["slow_pace_threshold"]
        fast_threshold = self.weights["fast_pace_threshold"]

        # Home team pace
        if home_pace < slow_threshold:
            score += self.weights["slow_pace_bonus"]
            details["home"] = f"Slow pace ({home_pace:.1f}): +{self.weights['slow_pace_bonus']}"
        elif home_pace > fast_threshold:
            score += self.weights["fast_pace_penalty"]
            details["home"] = f"Fast pace ({home_pace:.1f}): {self.weights['fast_pace_penalty']}"
        else:
            score += self.weights["medium_pace_bonus"]
            details["home"] = f"Medium pace ({home_pace:.1f}): +{self.weights['medium_pace_bonus']}"

        # Away team pace
        if away_pace < slow_threshold:
            score += self.weights["slow_pace_bonus"]
            details["away"] = f"Slow pace ({away_pace:.1f}): +{self.weights['slow_pace_bonus']}"
        elif away_pace > fast_threshold:
            score += self.weights["fast_pace_penalty"]
            details["away"] = f"Fast pace ({away_pace:.1f}): {self.weights['fast_pace_penalty']}"
        else:
            score += self.weights["medium_pace_bonus"]
            details["away"] = f"Medium pace ({away_pace:.1f}): +{self.weights['medium_pace_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_three_point(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate 3-point shooting characteristics"""
        score = 0
        details = {}

        # Home team
        home_3p_rate = home.get("three_p_rate", 0.35)
        home_3p_pct = home.get("three_p_pct", 35) / 100 if home.get("three_p_pct", 35) > 1 else home.get("three_p_pct", 0.35)

        if home_3p_rate < self.weights["low_3p_rate_threshold"]:
            score += self.weights["low_3p_rate_bonus"]
            details["home_rate"] = f"Low 3P rate ({home_3p_rate:.2%}): +{self.weights['low_3p_rate_bonus']}"

        if home_3p_pct > self.weights["high_3p_pct_threshold"]:
            score += self.weights["high_3p_pct_penalty"]
            details["home_pct"] = f"High 3P% ({home_3p_pct:.1%}): {self.weights['high_3p_pct_penalty']}"

        # Away team
        away_3p_rate = away.get("three_p_rate", 0.35)
        away_3p_pct = away.get("three_p_pct", 35) / 100 if away.get("three_p_pct", 35) > 1 else away.get("three_p_pct", 0.35)

        if away_3p_rate < self.weights["low_3p_rate_threshold"]:
            score += self.weights["low_3p_rate_bonus"]
            details["away_rate"] = f"Low 3P rate ({away_3p_rate:.2%}): +{self.weights['low_3p_rate_bonus']}"

        if away_3p_pct > self.weights["high_3p_pct_threshold"]:
            score += self.weights["high_3p_pct_penalty"]
            details["away_pct"] = f"High 3P% ({away_3p_pct:.1%}): {self.weights['high_3p_pct_penalty']}"

        details["total"] = score
        return score, details

    def _evaluate_free_throws(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate free throw rates"""
        score = 0
        details = {}

        home_ft_rate = home.get("ft_rate", 20)
        away_ft_rate = away.get("ft_rate", 20)

        # Home team
        if home_ft_rate < self.weights["low_ft_rate_threshold"]:
            score += self.weights["low_ft_rate_bonus"]
            details["home"] = f"Low FT rate ({home_ft_rate:.1f}/gm): +{self.weights['low_ft_rate_bonus']}"
        elif home_ft_rate > self.weights["high_ft_rate_threshold"]:
            score += self.weights["high_ft_rate_penalty"]
            details["home"] = f"High FT rate ({home_ft_rate:.1f}/gm): {self.weights['high_ft_rate_penalty']}"

        # Away team
        if away_ft_rate < self.weights["low_ft_rate_threshold"]:
            score += self.weights["low_ft_rate_bonus"]
            details["away"] = f"Low FT rate ({away_ft_rate:.1f}/gm): +{self.weights['low_ft_rate_bonus']}"
        elif away_ft_rate > self.weights["high_ft_rate_threshold"]:
            score += self.weights["high_ft_rate_penalty"]
            details["away"] = f"High FT rate ({away_ft_rate:.1f}/gm): {self.weights['high_ft_rate_penalty']}"

        details["total"] = score
        return score, details

    def _evaluate_turnovers(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate turnover rates (fewer possessions = good for under)"""
        score = 0
        details = {}

        home_to_rate = home.get("to_rate", 12)
        away_to_rate = away.get("to_rate", 12)

        if home_to_rate > self.weights["high_to_rate_threshold"]:
            score += self.weights["high_to_rate_bonus"]
            details["home"] = f"High TO rate ({home_to_rate:.1f}/gm): +{self.weights['high_to_rate_bonus']}"

        if away_to_rate > self.weights["high_to_rate_threshold"]:
            score += self.weights["high_to_rate_bonus"]
            details["away"] = f"High TO rate ({away_to_rate:.1f}/gm): +{self.weights['high_to_rate_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_defense(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate defensive efficiency"""
        score = 0
        details = {}

        home_def = home.get("def_efficiency", 100)
        away_def = away.get("def_efficiency", 100)

        if home_def < self.weights["strong_defense_threshold"]:
            score += self.weights["strong_defense_bonus"]
            details["home"] = f"Strong defense ({home_def:.1f}): +{self.weights['strong_defense_bonus']}"

        if away_def < self.weights["strong_defense_threshold"]:
            score += self.weights["strong_defense_bonus"]
            details["away"] = f"Strong defense ({away_def:.1f}): +{self.weights['strong_defense_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_fouls(self, home_fouls: Optional[int], away_fouls: Optional[int]) -> Tuple[float, Dict]:
        """
        Evaluate foul count impact on game pace
        High fouls = more stoppages and free throws = slower game = good for UNDER
        """
        score = 0
        details = {}

        if home_fouls is None or away_fouls is None:
            details["total"] = 0
            return 0, details

        total_fouls = home_fouls + away_fouls

        # Foul thresholds (adjusted per half):
        # - High fouls (>15 combined): +5 for under (significant stoppages)
        # - Very high fouls (>20 combined): +8 for under (lots of free throws)
        # - Low fouls (<8 combined): +3 for over (game flows faster)

        if total_fouls > 20:
            score += 8
            details["very_high"] = f"Very high fouls ({total_fouls}): +8"
        elif total_fouls > 15:
            score += 5
            details["high"] = f"High fouls ({total_fouls}): +5"
        elif total_fouls < 8:
            score -= 3  # Negative for under, positive for over when multiplier applied
            details["low"] = f"Low fouls ({total_fouls}): -3"

        details["total"] = score
        details["home_fouls"] = home_fouls
        details["away_fouls"] = away_fouls
        return score, details

    def _evaluate_matchup(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate matchup-specific factors"""
        score = 0
        details = {}

        home_pace = home.get("pace_per_game", home.get("pace", 70))
        away_pace = away.get("pace_per_game", away.get("pace", 70))
        home_def = home.get("def_efficiency", 100)
        away_def = away.get("def_efficiency", 100)

        slow_threshold = self.weights["slow_pace_threshold"]
        fast_threshold = self.weights["fast_pace_threshold"]
        strong_def_threshold = self.weights["strong_defense_threshold"]

        # Both teams slow
        if home_pace < slow_threshold and away_pace < slow_threshold:
            score += self.weights["both_slow_bonus"]
            details["both_slow"] = f"+{self.weights['both_slow_bonus']}"

        # Both teams strong defense
        if home_def < strong_def_threshold and away_def < strong_def_threshold:
            score += self.weights["both_strong_defense_bonus"]
            details["both_strong_def"] = f"+{self.weights['both_strong_defense_bonus']}"

        # Pace mismatch (one fast, one slow)
        if (home_pace < slow_threshold and away_pace > fast_threshold) or \
           (away_pace < slow_threshold and home_pace > fast_threshold):
            score += self.weights["pace_mismatch_penalty"]
            details["pace_mismatch"] = f"{self.weights['pace_mismatch_penalty']}"

        details["total"] = score
        return score, details

    # ========== NEW PHASE 2 EVALUATION FUNCTIONS (Added Nov 2025) ==========

    def _evaluate_assists(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate assists per game (ball movement and offensive flow)"""
        score = 0
        details = {}

        home_assists = home.get("assists_per_game", 13)
        away_assists = away.get("assists_per_game", 13)

        # High assists = good ball movement = efficient offense = OVER
        # Low assists = stagnant offense = fewer points = UNDER
        if home_assists >= self.weights["high_assists_threshold"]:
            score -= self.weights["high_assists_bonus"]  # Negative for UNDER (will flip for OVER)
            details["home"] = f"High assists ({home_assists:.1f}/gm): -{self.weights['high_assists_bonus']}"
        elif home_assists < self.weights["low_assists_threshold"]:
            score += self.weights["low_assists_bonus"]
            details["home"] = f"Low assists ({home_assists:.1f}/gm): +{self.weights['low_assists_bonus']}"

        if away_assists >= self.weights["high_assists_threshold"]:
            score -= self.weights["high_assists_bonus"]
            details["away"] = f"High assists ({away_assists:.1f}/gm): -{self.weights['high_assists_bonus']}"
        elif away_assists < self.weights["low_assists_threshold"]:
            score += self.weights["low_assists_bonus"]
            details["away"] = f"Low assists ({away_assists:.1f}/gm): +{self.weights['low_assists_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_ast_to_ratio(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate assist-to-turnover ratio (possession efficiency)"""
        score = 0
        details = {}

        home_ratio = home.get("ast_to_ratio", 1.2)
        away_ratio = away.get("ast_to_ratio", 1.2)

        # High ratio = efficient possessions = more scoring = OVER
        # Low ratio = sloppy play = fewer efficient possessions = UNDER
        if home_ratio >= self.weights["high_ast_to_threshold"]:
            score -= self.weights["high_ast_to_bonus"]  # Negative for UNDER (will flip for OVER)
            details["home"] = f"High A/TO ({home_ratio:.2f}): -{self.weights['high_ast_to_bonus']}"
        elif home_ratio < self.weights["low_ast_to_threshold"]:
            score += self.weights["low_ast_to_bonus"]
            details["home"] = f"Low A/TO ({home_ratio:.2f}): +{self.weights['low_ast_to_bonus']}"

        if away_ratio >= self.weights["high_ast_to_threshold"]:
            score -= self.weights["high_ast_to_bonus"]
            details["away"] = f"High A/TO ({away_ratio:.2f}): -{self.weights['high_ast_to_bonus']}"
        elif away_ratio < self.weights["low_ast_to_threshold"]:
            score += self.weights["low_ast_to_bonus"]
            details["away"] = f"Low A/TO ({away_ratio:.2f}): +{self.weights['low_ast_to_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_steals(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate steals per game (defensive pressure creates possessions)"""
        score = 0
        details = {}

        home_steals = home.get("steals_per_game", 6.5)
        away_steals = away.get("steals_per_game", 6.5)

        # High steals = creates extra possessions = more scoring = OVER
        # Note: Only bonus for high steals (no penalty for low)
        if home_steals >= self.weights["high_steals_threshold"]:
            score -= self.weights["high_steals_bonus"]  # Negative for UNDER (will flip for OVER)
            details["home"] = f"High steals ({home_steals:.1f}/gm): -{self.weights['high_steals_bonus']}"

        if away_steals >= self.weights["high_steals_threshold"]:
            score -= self.weights["high_steals_bonus"]
            details["away"] = f"High steals ({away_steals:.1f}/gm): -{self.weights['high_steals_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_blocks(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate blocks per game (rim protection/interior defense)"""
        score = 0
        details = {}

        home_blocks = home.get("blocks_per_game", 4)
        away_blocks = away.get("blocks_per_game", 4)

        # High blocks = strong interior defense = harder to score = UNDER
        # Note: Only bonus for high blocks (no penalty for low)
        if home_blocks >= self.weights["high_blocks_threshold"]:
            score += self.weights["high_blocks_bonus"]
            details["home"] = f"High blocks ({home_blocks:.1f}/gm): +{self.weights['high_blocks_bonus']}"

        if away_blocks >= self.weights["high_blocks_threshold"]:
            score += self.weights["high_blocks_bonus"]
            details["away"] = f"High blocks ({away_blocks:.1f}/gm): +{self.weights['high_blocks_bonus']}"

        details["total"] = score
        return score, details

    def _evaluate_rebounding(self, home: Dict, away: Dict) -> Tuple[float, Dict]:
        """Evaluate rebounding percentages (limits second-chance scoring)"""
        score = 0
        details = {}

        home_dreb = home.get("dreb_pct", 70)
        away_dreb = away.get("dreb_pct", 70)
        home_oreb = home.get("oreb_pct", 30)
        away_oreb = away.get("oreb_pct", 30)

        # High defensive rebounding = limit opponent second chances = UNDER
        if home_dreb >= self.weights["high_dreb_threshold"]:
            score += self.weights["high_dreb_bonus"]
            details["home_dreb"] = f"High DReb% ({home_dreb:.1f}%): +{self.weights['high_dreb_bonus']}"

        if away_dreb >= self.weights["high_dreb_threshold"]:
            score += self.weights["high_dreb_bonus"]
            details["away_dreb"] = f"High DReb% ({away_dreb:.1f}%): +{self.weights['high_dreb_bonus']}"

        # Low offensive rebounding = fewer second chances = UNDER
        if home_oreb < self.weights["low_oreb_threshold"]:
            score += self.weights["low_oreb_bonus"]
            details["home_oreb"] = f"Low OReb% ({home_oreb:.1f}%): +{self.weights['low_oreb_bonus']}"

        if away_oreb < self.weights["low_oreb_threshold"]:
            score += self.weights["low_oreb_bonus"]
            details["away_oreb"] = f"Low OReb% ({away_oreb:.1f}%): +{self.weights['low_oreb_bonus']}"

        details["total"] = score
        return score, details

    # ========== END PHASE 2 FUNCTIONS ==========

    def _evaluate_ppm_severity(self, required_ppm: float) -> float:
        """
        Adjust confidence based on how difficult the required PPM is
        BALANCED - Symmetric scoring for both high PPM (under) and low PPM (over)

        Higher PPM = harder to hit = more confident in under
        Lower PPM = easier to hit = more confident in under (but less bonus)
        """
        if required_ppm > 6.0:
            return 12  # Very difficult pace needed (favors under)
        elif required_ppm > 5.5:
            return 8
        elif required_ppm > 5.0:
            return 4
        elif required_ppm > 4.5:
            return 0
        elif required_ppm > 3.5:
            return -4  # Moderate pace (slightly favors over)
        elif required_ppm > 2.5:
            return -8  # Low PPM needed (favors over)
        elif required_ppm > 2.0:
            return -10
        else:
            return -12  # Very low PPM (strongly favors over) - symmetric to >6.0

    def _evaluate_over_pace(self, required_ppm: float, current_ppm: float) -> float:
        """
        Adjust confidence for OVER bets based on scoring pace

        For OVER:
        - Low required PPM = they're scoring fast already = good
        - High current PPM compared to required = good
        """
        # Low required PPM is good for OVER
        if required_ppm < 0.5:
            score = 15  # Very low, likely to go over
        elif required_ppm < 1.0:
            score = 10
        elif required_ppm < 1.5:
            score = 5
        else:
            score = 0

        # Bonus if current pace is significantly higher than needed
        if current_ppm > 0 and required_ppm > 0:
            pace_ratio = current_ppm / required_ppm
            if pace_ratio > 2.0:
                score += 10  # Scoring twice as fast as needed
            elif pace_ratio > 1.5:
                score += 5

        return score

    def _get_unit_recommendation(self, confidence: float) -> float:
        """Convert confidence score to unit recommendation (UPDATED - Max 2 units)"""
        units = config.UNIT_SIZES

        if units["no_bet"][0] <= confidence <= units["no_bet"][1]:
            return 0  # 0-64: Don't bet
        elif units["low"][0] <= confidence <= units["low"][1]:
            return 1.0  # 65-74: 1 unit (53.8% WR)
        elif units["high"][0] <= confidence <= units["high"][1]:
            return 2.0  # 75-100: 2 units MAX (85+ will be blocked by MAX_CONFIDENCE_TO_BET)
        else:
            return 0

    def _evaluate_live_shooting(
        self,
        home_metrics: Dict,
        away_metrics: Dict,
        home_live_stats: Optional[Dict],
        away_live_stats: Optional[Dict]
    ) -> Tuple[float, Dict]:
        """
        Evaluate live shooting performance vs season averages
        Hot shooting = likely OVER, Cold shooting = likely UNDER
        """
        score = 0
        breakdown = {}

        if not home_live_stats and not away_live_stats:
            return 0, {"note": "No live stats available"}

        # Compare live FG% to season eFG%
        shooting_variance = []

        if home_live_stats and home_metrics:
            live_fg = home_live_stats.get('fg_pct', 0)
            season_efg = home_metrics.get('efg_pct', 0)
            if live_fg > 0 and season_efg > 0:
                variance = live_fg - season_efg
                shooting_variance.append(variance)
                breakdown["home_variance"] = round(variance, 1)

        if away_live_stats and away_metrics:
            live_fg = away_live_stats.get('fg_pct', 0)
            season_efg = away_metrics.get('efg_pct', 0)
            if live_fg > 0 and season_efg > 0:
                variance = live_fg - season_efg
                shooting_variance.append(variance)
                breakdown["away_variance"] = round(variance, 1)

        if shooting_variance:
            avg_variance = sum(shooting_variance) / len(shooting_variance)
            breakdown["avg_variance"] = round(avg_variance, 1)

            # Hot shooting (>5% above season avg) = favors OVER
            # Cold shooting (<-5% below season avg) = favors UNDER
            if avg_variance > 5:
                score = -8  # Negative = favors over (will be flipped for under bets)
                breakdown["note"] = "Hot shooting - favors OVER"
            elif avg_variance < -5:
                score = 8  # Positive = favors under
                breakdown["note"] = "Cold shooting - favors UNDER"
            elif avg_variance > 2:
                score = -4
                breakdown["note"] = "Above average shooting"
            elif avg_variance < -2:
                score = 4
                breakdown["note"] = "Below average shooting"

        return score, breakdown

    def _evaluate_live_ft_impact(
        self,
        home_live_stats: Optional[Dict],
        away_live_stats: Optional[Dict]
    ) -> Tuple[float, Dict]:
        """
        Evaluate free throw impact on game flow
        Lots of FTs slow the game = favors UNDER
        """
        score = 0
        breakdown = {}

        if not home_live_stats and not away_live_stats:
            return 0, {"note": "No live stats available"}

        total_ft_attempts = 0
        if home_live_stats:
            total_ft_attempts += home_live_stats.get('ft_attempted', 0)
        if away_live_stats:
            total_ft_attempts += away_live_stats.get('ft_attempted', 0)

        breakdown["total_ft_attempts"] = total_ft_attempts

        # High FT rate slows game
        if total_ft_attempts > 20:
            score = 6  # Strong indicator for under
            breakdown["note"] = "Very high FT rate - game slowing"
        elif total_ft_attempts > 15:
            score = 4
            breakdown["note"] = "High FT rate - favors UNDER"
        elif total_ft_attempts > 10:
            score = 2
            breakdown["note"] = "Moderate FT rate"
        else:
            score = -2
            breakdown["note"] = "Low FT rate - game flowing"

        return score, breakdown

    def _evaluate_live_turnovers(
        self,
        home_live_stats: Optional[Dict],
        away_live_stats: Optional[Dict]
    ) -> Tuple[float, Dict]:
        """
        Evaluate turnover rate affecting possessions
        High turnovers = fewer possessions = favors UNDER
        """
        score = 0
        breakdown = {}

        if not home_live_stats and not away_live_stats:
            return 0, {"note": "No live stats available"}

        total_turnovers = 0
        total_fg_attempts = 0

        if home_live_stats:
            total_turnovers += home_live_stats.get('turnovers', 0)
            total_fg_attempts += home_live_stats.get('fg_attempted', 0)
        if away_live_stats:
            total_turnovers += away_live_stats.get('turnovers', 0)
            total_fg_attempts += away_live_stats.get('fg_attempted', 0)

        breakdown["total_turnovers"] = total_turnovers
        breakdown["total_fg_attempts"] = total_fg_attempts

        # High turnover rate (relative to possessions)
        if total_fg_attempts > 0:
            to_rate = total_turnovers / (total_fg_attempts / 10)  # Approximate possessions
            breakdown["to_rate"] = round(to_rate, 2)

            if to_rate > 2.0:
                score = 5  # High turnovers = fewer possessions = under
                breakdown["note"] = "Very high turnover rate - favors UNDER"
            elif to_rate > 1.5:
                score = 3
                breakdown["note"] = "High turnover rate"
            elif to_rate < 1.0:
                score = -3
                breakdown["note"] = "Low turnover rate - clean game"
        else:
            # Absolute turnover count
            if total_turnovers > 15:
                score = 4
                breakdown["note"] = "High turnovers - fewer possessions"
            elif total_turnovers < 8:
                score = -2
                breakdown["note"] = "Low turnovers"

        return score, breakdown

    def _evaluate_live_rebounding(
        self,
        home_live_stats: Optional[Dict],
        away_live_stats: Optional[Dict]
    ) -> Tuple[float, Dict]:
        """
        Evaluate rebounding battle
        High offensive rebounding = extra possessions = favors OVER
        """
        score = 0
        breakdown = {}

        if not home_live_stats and not away_live_stats:
            return 0, {"note": "No live stats available"}

        total_off_rebounds = 0
        total_rebounds = 0

        if home_live_stats:
            total_off_rebounds += home_live_stats.get('rebounds_offensive', 0)
            total_rebounds += home_live_stats.get('rebounds_total', 0)
        if away_live_stats:
            total_off_rebounds += away_live_stats.get('rebounds_offensive', 0)
            total_rebounds += away_live_stats.get('rebounds_total', 0)

        breakdown["total_off_rebounds"] = total_off_rebounds
        breakdown["total_rebounds"] = total_rebounds

        if total_rebounds > 0:
            off_reb_pct = (total_off_rebounds / total_rebounds) * 100
            breakdown["off_reb_pct"] = round(off_reb_pct, 1)

            # High offensive rebounding % = extra possessions = over
            if off_reb_pct > 35:
                score = -4  # Negative = favors over
                breakdown["note"] = "High offensive rebounding - extra possessions"
            elif off_reb_pct > 30:
                score = -2
                breakdown["note"] = "Above average offensive rebounding"
            elif off_reb_pct < 20:
                score = 2
                breakdown["note"] = "Low offensive rebounding - limited second chances"

        return score, breakdown

    def _evaluate_referee_impact(self, referee_crew_stats: Dict) -> Tuple[float, Dict]:
        """
        Evaluate referee crew tendencies and their impact on game flow

        Key Metrics:
        - Crew Style (Tight/Average/Loose): Affects game pace and scoring
        - Avg Fouls Per Game: More fouls = slower game = favors UNDER
        - Home Bias: Affects which team gets favorable calls

        Args:
            referee_crew_stats: Dictionary with crew statistics

        Returns:
            Tuple of (score, breakdown_dict)
        """
        score = 0
        breakdown = {}

        crew_style = referee_crew_stats.get('crew_style', 'Unknown')
        avg_fouls = referee_crew_stats.get('avg_fouls_per_game')
        home_bias = referee_crew_stats.get('avg_home_bias')
        found_refs = referee_crew_stats.get('found_refs', 0)
        total_refs = referee_crew_stats.get('total_refs', 0)

        breakdown['found_refs'] = found_refs
        breakdown['total_refs'] = total_refs

        if avg_fouls is None:
            return 0, {"note": "No referee data available"}

        # === CREW STYLE ANALYSIS ===
        # Tight refs (40+ fouls/game) = slower game = UNDER
        # Loose refs (32- fouls/game) = faster game = OVER
        if crew_style == 'Tight':
            score += 7
            breakdown['crew_style'] = f"Tight crew ({avg_fouls:.1f} fouls/g): +7"
        elif crew_style == 'Loose':
            score -= 7  # Negative favors OVER
            breakdown['crew_style'] = f"Loose crew ({avg_fouls:.1f} fouls/g): -7 (favors over)"
        else:  # Average
            if avg_fouls > 38:
                score += 4
                breakdown['crew_style'] = f"Above avg fouls ({avg_fouls:.1f}/g): +4"
            elif avg_fouls < 34:
                score -= 4
                breakdown['crew_style'] = f"Below avg fouls ({avg_fouls:.1f}/g): -4 (favors over)"
            else:
                score += 0
                breakdown['crew_style'] = f"Average crew ({avg_fouls:.1f} fouls/g): neutral"

        # === FOULS PER GAME GRANULAR ANALYSIS ===
        # Additional scoring based on exact foul rate
        if avg_fouls >= 45:
            score += 6
            breakdown['foul_rate'] = f"Very high foul rate (≥45/g): +6"
        elif avg_fouls >= 42:
            score += 4
            breakdown['foul_rate'] = f"High foul rate (42-45/g): +4"
        elif avg_fouls <= 30:
            score -= 6
            breakdown['foul_rate'] = f"Very low foul rate (≤30/g): -6 (favors over)"
        elif avg_fouls <= 33:
            score -= 4
            breakdown['foul_rate'] = f"Low foul rate (30-33/g): -4 (favors over)"

        # === HOME BIAS ANALYSIS ===
        # Significant home bias can affect game flow
        # This is neutral for O/U but useful context
        if home_bias is not None:
            if abs(home_bias) > 2.0:
                breakdown['home_bias'] = f"Strong bias: {home_bias:+.2f} (favors {'home' if home_bias > 0 else 'away'})"
            elif abs(home_bias) > 1.0:
                breakdown['home_bias'] = f"Moderate bias: {home_bias:+.2f}"
            else:
                breakdown['home_bias'] = f"Neutral: {home_bias:+.2f}"

        # === DATA CONFIDENCE ADJUSTMENT ===
        # If we only have stats for some refs, reduce impact
        if found_refs < total_refs:
            coverage_pct = (found_refs / total_refs) * 100
            score = score * (coverage_pct / 100)
            breakdown['coverage'] = f"{found_refs}/{total_refs} refs matched ({coverage_pct:.0f}% coverage)"

        breakdown['total_score'] = round(score, 1)

        return score, breakdown

    def update_weights(self, new_weights: Dict):
        """Update scoring weights (for admin panel adjustments)"""
        self.weights.update(new_weights)
        logger.info(f"Updated confidence scoring weights: {new_weights}")


# Singleton instance
_scorer = None

def get_confidence_scorer() -> ConfidenceScorer:
    """Get singleton confidence scorer instance"""
    global _scorer
    if _scorer is None:
        _scorer = ConfidenceScorer()
    return _scorer
