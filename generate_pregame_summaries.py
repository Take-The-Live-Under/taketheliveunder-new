#!/usr/bin/env python3
"""
Generate AI Summaries for Pregame Predictions

Reads predictions from API, generates AI-powered summaries using our
early season analysis, and pushes enhanced predictions back to dashboard.
"""

import requests
import json
from utils.pregame_ai_summary import get_pregame_ai_summary_generator

# API Configuration
API_URL = "http://localhost:8000"


def main():
    """Generate AI summaries for all current predictions"""
    print("="*80)
    print("Pregame AI Summary Generator")
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

    # Initialize AI summary generator
    print("\n🤖 Initializing AI summary generator...")
    generator = get_pregame_ai_summary_generator()

    if not generator.client:
        print("❌ OpenAI API key not configured")
        print("   Set OPENAI_API_KEY environment variable to generate AI summaries")
        return

    # Generate summaries for each prediction
    print(f"\n📊 Generating AI summaries for {len(predictions)} games...")
    enhanced_predictions = []

    for i, prediction in enumerate(predictions, 1):
        home_team = prediction.get('home_team', 'Unknown')
        away_team = prediction.get('away_team', 'Unknown')

        print(f"\n{i}. {away_team} @ {home_team}")
        print(f"   Projected: {prediction.get('projected_total', 0):.1f}")
        print(f"   Line: {prediction.get('ou_line', 0):.1f}")
        print(f"   Edge: {prediction.get('vs_line', 0):+.1f}")
        print(f"   Suggestion: {prediction.get('suggestion', 'PASS')}")

        # Generate AI summary
        try:
            summary = generator.generate_pregame_summary(prediction)

            # Add summary to prediction
            prediction['ai_summary'] = summary['summary']
            prediction['ai_recommendation'] = summary['recommendation']
            prediction['ai_confidence_stars'] = summary.get('confidence_stars', '3')
            prediction['ai_key_factors'] = summary.get('key_factors', [])
            prediction['ai_edge_analysis'] = summary.get('edge_analysis', '')

            print(f"   ✅ AI: {summary['recommendation']} ({summary.get('confidence_stars', '3')} stars)")

        except Exception as e:
            print(f"   ⚠️  Error generating summary: {e}")
            prediction['ai_summary'] = "Error generating summary"
            prediction['ai_recommendation'] = prediction.get('suggestion', 'PASS')

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
    for pred in enhanced_predictions:
        rec = pred.get('ai_recommendation', 'PASS')
        recommendations[rec] = recommendations.get(rec, 0) + 1

    print("\nAI Recommendations:")
    for rec, count in sorted(recommendations.items()):
        print(f"  {rec}: {count}")

    print("\n✅ Enhanced predictions available at http://localhost:3002")
    print("   (Pregame Predictions tab)")

    return True


if __name__ == "__main__":
    main()
