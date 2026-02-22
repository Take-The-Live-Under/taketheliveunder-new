#!/usr/bin/env python3
"""
Generate Data-Driven Summaries for Pregame Predictions

Creates intelligent summaries based on our early season analysis without requiring OpenAI.
Uses pattern matching and data thresholds from our 51-game early season study.
"""

import requests
import json
from typing import Dict, List


# API Configuration
API_URL = "http://localhost:8000"


def generate_data_summary(prediction: Dict) -> Dict:
    """
    Generate summary based on prediction data and early season patterns

    Returns dict with: summary, recommendation, key_factors, confidence_level
    """
    home_team = prediction.get('home_team', 'Home')
    away_team = prediction.get('away_team', 'Away')
    projected_total = prediction.get('projected_total', 0)
    ou_line = prediction.get('ou_line', 0)
    vs_line = prediction.get('vs_line', 0)
    suggestion = prediction.get('suggestion', 'PASS')

    projected_tempo = prediction.get('projected_tempo', 68.0)
    in_sweet_spot = prediction.get('in_tempo_sweet_spot', False)
    early_season_bonus = prediction.get('early_season_bonus', 0)
    tempo_bonus = prediction.get('tempo_bonus', 0)
    confidence = prediction.get('confidence', 50)

    # Key factors list
    key_factors = []

    # Summary components
    summary_parts = []

    # 1. Analyze the edge
    edge_abs = abs(vs_line)
    if edge_abs >= 8:
        edge_strength = "significant"
        edge_confidence = "High"
    elif edge_abs >= 5:
        edge_strength = "moderate"
        edge_confidence = "Medium-High"
    elif edge_abs >= 2:
        edge_strength = "slight"
        edge_confidence = "Medium"
    else:
        edge_strength = "minimal"
        edge_confidence = "Low"

    summary_parts.append(f"Our model projects a {edge_strength} edge ({vs_line:+.1f} points)")

    if vs_line > 0:
        key_factors.append(f"Line is {edge_abs:.1f} points HIGHER than our projection")
    elif vs_line < 0:
        key_factors.append(f"Line is {edge_abs:.1f} points LOWER than our projection")

    # 2. Tempo sweet spot analysis
    if in_sweet_spot:
        summary_parts.append("Game falls in tempo sweet spot (66-68 possessions)")
        key_factors.append(f"Tempo sweet spot: {projected_tempo:.1f} possessions (historically scores 7-10 pts higher)")
        key_factors.append(f"Sweet spot bonus: +{tempo_bonus:.1f} points added to projection")
    elif projected_tempo < 66:
        summary_parts.append(f"Slower pace ({projected_tempo:.1f}) typically favors UNDER")
        key_factors.append(f"Slow tempo: {projected_tempo:.1f} possessions (avg 147.8 in early season)")
    elif projected_tempo > 70:
        summary_parts.append(f"Fast pace ({projected_tempo:.1f}) with high variance")
        key_factors.append(f"Fast tempo: {projected_tempo:.1f} possessions (more unpredictable)")
    else:
        key_factors.append(f"Normal tempo: {projected_tempo:.1f} possessions")

    # 3. Early season context
    if early_season_bonus > 0:
        key_factors.append(f"Early season inflation: +{early_season_bonus:.1f} points (defenses not yet refined)")

    # 4. Projected total context
    if projected_total > 155:
        summary_parts.append("High-scoring matchup projected")
    elif projected_total < 140:
        summary_parts.append("Low-scoring defensive battle projected")

    # 5. Generate recommendation
    if edge_abs >= 5:
        if vs_line > 0:
            recommendation = "BET UNDER"
            rec_confidence = "★★★★" if edge_abs >= 8 else "★★★"
        else:
            recommendation = "BET OVER"
            rec_confidence = "★★★★" if edge_abs >= 8 else "★★★"
    elif edge_abs >= 2:
        if vs_line > 0:
            recommendation = "LEAN UNDER"
            rec_confidence = "★★"
        else:
            recommendation = "LEAN OVER"
            rec_confidence = "★★"
    else:
        recommendation = "PASS"
        rec_confidence = "★"
        summary_parts.append("Edge too small to recommend betting")

    # Build final summary
    summary = " | ".join(summary_parts) + "."

    # Add special notes based on patterns
    special_notes = []

    # Home court advantage note
    if confidence >= 75:
        special_notes.append("Strong home court factor in projection")

    # Tempo variance warning
    if projected_tempo > 72 or projected_tempo < 63:
        special_notes.append("⚠️ Extreme tempo - higher variance expected")

    # Sweet spot opportunity
    if in_sweet_spot and abs(vs_line) >= 3:
        special_notes.append("🎯 SWEET SPOT OPPORTUNITY: Tempo + Edge align")

    return {
        'summary': summary,
        'recommendation': recommendation,
        'confidence_stars': rec_confidence,
        'key_factors': key_factors,
        'special_notes': special_notes,
        'edge_analysis': f"{edge_confidence} confidence in {edge_strength} edge of {vs_line:+.1f} points"
    }


def main():
    """Generate data-driven summaries for all current predictions"""
    print("="*80)
    print("Data-Driven Pregame Summary Generator")
    print("Using Early Season Analysis Patterns (51-game study)")
    print("="*80)

    # Fetch current predictions from API
    print("\n📥 Fetching predictions from API...")
    try:
        response = requests.get(f"{API_URL}/api/predictions/latest", timeout=5)
        response.raise_for_status()
        data = response.json()
        predictions = data.get('predictions', [])

        if not predictions:
            print("⚠️  No predictions found")
            return

        print(f"✅ Found {len(predictions)} predictions")

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching predictions: {e}")
        print("   Make sure API is running: python api/main.py")
        return

    # Generate summaries for each prediction
    print(f"\n📊 Generating data-driven summaries for {len(predictions)} games...")
    enhanced_predictions = []

    for i, prediction in enumerate(predictions, 1):
        home_team = prediction.get('home_team', 'Unknown')
        away_team = prediction.get('away_team', 'Unknown')

        print(f"\n{i}. {away_team} @ {home_team}")
        print(f"   Projected: {prediction.get('projected_total', 0):.1f}")
        print(f"   Line: {prediction.get('ou_line', 0):.1f}")
        print(f"   Edge: {prediction.get('vs_line', 0):+.1f}")

        # Generate summary
        summary = generate_data_summary(prediction)

        # Add summary to prediction
        prediction['ai_summary'] = summary['summary']
        prediction['ai_recommendation'] = summary['recommendation']
        prediction['ai_confidence_stars'] = summary['confidence_stars']
        prediction['ai_key_factors'] = summary['key_factors']
        prediction['ai_edge_analysis'] = summary['edge_analysis']
        prediction['special_notes'] = summary.get('special_notes', [])

        print(f"   ✅ {summary['recommendation']} ({summary['confidence_stars']})")

        if summary.get('special_notes'):
            for note in summary['special_notes']:
                print(f"      {note}")

        enhanced_predictions.append(prediction)

    # Push enhanced predictions back to API
    print(f"\n📤 Pushing {len(enhanced_predictions)} enhanced predictions to API...")
    try:
        response = requests.post(
            f"{API_URL}/api/predictions/update",
            json={"predictions": enhanced_predictions},
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Successfully pushed enhanced predictions to API")
        else:
            print(f"⚠️  API returned status {response.status_code}")
    except Exception as e:
        print(f"⚠️  Error pushing to API: {e}")

    # Display summary
    print("\n" + "="*80)
    print("SUMMARY GENERATION COMPLETE")
    print("="*80)
    print(f"Predictions analyzed: {len(enhanced_predictions)}")

    # Count recommendations
    recommendations = {}
    sweet_spot_count = 0
    for pred in enhanced_predictions:
        rec = pred.get('ai_recommendation', 'PASS')
        recommendations[rec] = recommendations.get(rec, 0) + 1
        if pred.get('in_tempo_sweet_spot'):
            sweet_spot_count += 1

    print("\nRecommendations:")
    for rec, count in sorted(recommendations.items()):
        print(f"  {rec}: {count}")

    print(f"\nGames in Tempo Sweet Spot: {sweet_spot_count}")
    print(f"Sweet Spot Opportunities (edge >= 3): {sum(1 for p in enhanced_predictions if p.get('in_tempo_sweet_spot') and abs(p.get('vs_line', 0)) >= 3)}")

    print("\n✅ Enhanced predictions available at http://localhost:3002")
    print("   (View Pregame Predictions tab)")

    # Show top 3 opportunities
    print("\n🎯 TOP 3 BETTING OPPORTUNITIES:")
    sorted_preds = sorted(enhanced_predictions, key=lambda x: abs(x.get('vs_line', 0)), reverse=True)
    for i, pred in enumerate(sorted_preds[:3], 1):
        print(f"\n{i}. {pred['away_team']} @ {pred['home_team']}")
        print(f"   Edge: {pred.get('vs_line', 0):+.1f} → {pred.get('ai_recommendation', 'PASS')}")
        print(f"   {pred.get('ai_summary', '')}")

    return True


if __name__ == "__main__":
    main()
