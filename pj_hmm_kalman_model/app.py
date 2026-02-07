#!/usr/bin/env python3
"""
Local Flask App for HMM/Kalman Model Testing
Run with: python app.py
Access at: http://localhost:5000
"""

import sys
sys.stdout.reconfigure(line_buffering=True)

from flask import Flask, render_template, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
import json
import pickle
from pathlib import Path
from datetime import datetime
import os

# Add paths
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent / "src"))

app = Flask(__name__, static_folder='outputs', template_folder='templates')
app.config['SECRET_KEY'] = 'basketball-testing-key'

# Global model storage
MODEL = None
MODEL_LOADED = False
PROJECTIONS_DF = None

def load_model():
    """Load the V2 model and generate projections"""
    global MODEL, MODEL_LOADED, PROJECTIONS_DF

    if MODEL_LOADED:
        return True

    print("Loading V2 Model...", flush=True)

    try:
        from src.pj_engine_v2 import get_pj_engine_v2

        # Find latest data file
        data_dir = Path(__file__).parent / "outputs"
        data_files = list(data_dir.glob("season_pbp_*.csv"))
        if data_files:
            data_file = sorted(data_files)[-1]
        else:
            data_file = data_dir / "model_input.csv"

        print(f"Using data: {data_file}", flush=True)

        MODEL = get_pj_engine_v2(n_states=4)
        MODEL.load_data(str(data_file))
        MODEL.fit_hmm()
        MODEL.learn_minute_biases(validation_split=0.3)
        PROJECTIONS_DF = MODEL.generate_projections()

        # Calculate accuracy metrics
        game_totals = PROJECTIONS_DF.groupby('game_id')['points_so_far'].max().reset_index()
        game_totals.columns = ['game_id', 'actual_total']
        PROJECTIONS_DF = PROJECTIONS_DF.merge(game_totals, on='game_id')
        PROJECTIONS_DF['error'] = PROJECTIONS_DF['projected_total'] - PROJECTIONS_DF['actual_total']
        PROJECTIONS_DF['abs_error'] = PROJECTIONS_DF['error'].abs()

        MODEL_LOADED = True
        print("Model loaded successfully!", flush=True)
        return True

    except Exception as e:
        print(f"Error loading model: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return False


@app.route('/')
def index():
    """Main dashboard"""
    if not MODEL_LOADED:
        load_model()

    return render_template('index.html')


@app.route('/api/status')
def api_status():
    """Get model status"""
    return jsonify({
        'model_loaded': MODEL_LOADED,
        'n_games': PROJECTIONS_DF['game_id'].nunique() if PROJECTIONS_DF is not None else 0,
        'n_projections': len(PROJECTIONS_DF) if PROJECTIONS_DF is not None else 0
    })


@app.route('/api/accuracy')
def api_accuracy():
    """Get accuracy metrics by minute"""
    if not MODEL_LOADED:
        load_model()

    if PROJECTIONS_DF is None:
        return jsonify({'error': 'Model not loaded'}), 500

    # Filter to regulation time
    df = PROJECTIONS_DF[PROJECTIONS_DF['minute_index'] <= 40].copy()

    # Calculate metrics by minute
    metrics = []
    for minute in range(4, 41):
        min_data = df[df['minute_index'] == minute]
        if len(min_data) > 0:
            metrics.append({
                'minute': minute,
                'mae': round(min_data['abs_error'].mean(), 2),
                'within_5': round((min_data['abs_error'] <= 5).mean() * 100, 1),
                'within_6': round((min_data['abs_error'] <= 6).mean() * 100, 1),
                'within_10': round((min_data['abs_error'] <= 10).mean() * 100, 1),
                'n_games': len(min_data)
            })

    return jsonify({
        'metrics': metrics,
        'summary': {
            'total_games': df['game_id'].nunique(),
            'avg_late_mae': round(df[df['minute_index'] >= 35]['abs_error'].mean(), 2),
            'avg_late_within6': round((df[df['minute_index'] >= 35]['abs_error'] <= 6).mean() * 100, 1)
        }
    })


@app.route('/api/game/<game_id>')
def api_game(game_id):
    """Get projections for a specific game"""
    if not MODEL_LOADED:
        load_model()

    if PROJECTIONS_DF is None:
        return jsonify({'error': 'Model not loaded'}), 500

    game_data = PROJECTIONS_DF[PROJECTIONS_DF['game_id'] == game_id]

    if len(game_data) == 0:
        return jsonify({'error': 'Game not found'}), 404

    return jsonify({
        'game_id': game_id,
        'actual_total': int(game_data['actual_total'].iloc[0]),
        'projections': game_data[['minute_index', 'projected_total', 'points_so_far',
                                   'hmm_state_label', 'error']].to_dict('records')
    })


@app.route('/api/games')
def api_games():
    """Get list of available games"""
    if not MODEL_LOADED:
        load_model()

    if PROJECTIONS_DF is None:
        return jsonify({'error': 'Model not loaded'}), 500

    games = PROJECTIONS_DF.groupby('game_id').agg({
        'actual_total': 'first',
        'minute_index': 'max'
    }).reset_index()

    games = games.head(100)  # Limit to 100 games

    return jsonify({
        'games': games.to_dict('records')
    })


@app.route('/api/predict', methods=['POST'])
def api_predict():
    """Make a prediction for custom input"""
    if not MODEL_LOADED:
        load_model()

    data = request.json

    points_so_far = data.get('points_so_far', 100)
    minute = data.get('minute', 30)
    poss_so_far = data.get('poss_so_far', minute * 1.8)
    score_diff = data.get('score_diff', 0)

    minutes_remaining = 40 - minute
    historical_ppm = points_so_far / max(minute, 1)

    # Simple projection
    proj_simple = points_so_far + historical_ppm * minutes_remaining

    # Possession-based
    if poss_so_far > 0:
        ppp = points_so_far / poss_so_far
        expected_poss = (poss_so_far / minute) * minutes_remaining
        proj_poss = points_so_far + ppp * expected_poss
    else:
        proj_poss = proj_simple

    # Blended (weighted by game progress)
    progress = minute / 40
    if progress >= 0.875:  # Last 5 min
        poss_weight = 0.3
    else:
        poss_weight = 0.15

    proj_blended = (1 - poss_weight) * proj_simple + poss_weight * proj_poss

    return jsonify({
        'input': {
            'minute': minute,
            'points_so_far': points_so_far,
            'poss_so_far': poss_so_far,
            'score_diff': score_diff,
            'minutes_remaining': minutes_remaining
        },
        'projections': {
            'simple_ppm': round(proj_simple, 1),
            'possession_based': round(proj_poss, 1),
            'blended': round(proj_blended, 1),
            'expected_ppm': round(historical_ppm, 2)
        }
    })


@app.route('/outputs/<path:filename>')
def serve_output(filename):
    """Serve output files (visualizations)"""
    return send_from_directory('outputs', filename)


# Create templates directory and HTML files
def create_templates():
    """Create the HTML templates"""
    templates_dir = Path(__file__).parent / "templates"
    templates_dir.mkdir(exist_ok=True)

    index_html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HMM/Kalman Model Testing</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        h1 { color: #00d4ff; margin-bottom: 20px; }
        h2 { color: #ffd700; margin: 20px 0 10px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .card {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .stat-box {
            display: inline-block;
            background: #0f3460;
            padding: 15px 25px;
            border-radius: 8px;
            margin: 5px;
            text-align: center;
        }
        .stat-value { font-size: 2em; font-weight: bold; color: #00d4ff; }
        .stat-label { font-size: 0.9em; color: #aaa; }
        .success { color: #00ff88; }
        .warning { color: #ffaa00; }
        .error { color: #ff4444; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        th { background: #0f3460; color: #ffd700; }
        tr:hover { background: #1f4068; }
        input, button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 1em;
            margin: 5px;
        }
        input {
            background: #0f3460;
            color: #fff;
            width: 120px;
        }
        button {
            background: #00d4ff;
            color: #000;
            cursor: pointer;
            font-weight: bold;
        }
        button:hover { background: #00a8cc; }
        .chart-container { height: 300px; margin-top: 20px; }
        #loading { text-align: center; padding: 40px; color: #aaa; }
        .target-met { background: #00ff8822; }
    </style>
</head>
<body>
    <div class="container">
        <h1>HMM/Kalman Basketball Total Predictor</h1>
        <p style="color:#aaa; margin-bottom: 20px;">Local Testing Server - V2 Model with Possession Blending</p>

        <div id="loading">Loading model... This may take a minute.</div>

        <div id="content" style="display: none;">
            <!-- Summary Stats -->
            <div class="grid">
                <div class="card">
                    <h2>Model Status</h2>
                    <div id="status-stats"></div>
                </div>
                <div class="card">
                    <h2>Late Game Performance (Min 35+)</h2>
                    <div id="late-stats"></div>
                </div>
            </div>

            <!-- Accuracy Chart -->
            <div class="card" style="margin-top: 20px;">
                <h2>Accuracy by Minute</h2>
                <div class="chart-container">
                    <canvas id="accuracyChart"></canvas>
                </div>
            </div>

            <!-- Prediction Tool -->
            <div class="card" style="margin-top: 20px;">
                <h2>Test Prediction</h2>
                <div>
                    <label>Minute: <input type="number" id="input-minute" value="35" min="1" max="40"></label>
                    <label>Points So Far: <input type="number" id="input-points" value="120"></label>
                    <label>Possessions: <input type="number" id="input-poss" value="63"></label>
                    <label>Score Diff: <input type="number" id="input-diff" value="5"></label>
                    <button onclick="makePrediction()">Predict</button>
                </div>
                <div id="prediction-result" style="margin-top: 15px;"></div>
            </div>

            <!-- Accuracy Table -->
            <div class="card" style="margin-top: 20px;">
                <h2>Accuracy by Minute (Detail)</h2>
                <table id="accuracy-table">
                    <thead>
                        <tr>
                            <th>Minute</th>
                            <th>MAE</th>
                            <th>Within 5</th>
                            <th>Within 6</th>
                            <th>Within 10</th>
                            <th>Games</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let accuracyData = null;

        async function loadData() {
            try {
                const response = await fetch('/api/accuracy');
                accuracyData = await response.json();
                displayData();
            } catch (e) {
                document.getElementById('loading').innerHTML = 'Error loading data: ' + e;
            }
        }

        function displayData() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';

            const summary = accuracyData.summary;

            // Status stats
            document.getElementById('status-stats').innerHTML = `
                <div class="stat-box">
                    <div class="stat-value">${summary.total_games}</div>
                    <div class="stat-label">Games Analyzed</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value success">V2</div>
                    <div class="stat-label">Model Version</div>
                </div>
            `;

            // Late game stats
            const w6Class = summary.avg_late_within6 >= 70 ? 'success' : 'warning';
            document.getElementById('late-stats').innerHTML = `
                <div class="stat-box">
                    <div class="stat-value">${summary.avg_late_mae}</div>
                    <div class="stat-label">Average MAE</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value ${w6Class}">${summary.avg_late_within6}%</div>
                    <div class="stat-label">Within 6 Points</div>
                </div>
            `;

            // Chart
            const ctx = document.getElementById('accuracyChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: accuracyData.metrics.map(m => m.minute),
                    datasets: [
                        {
                            label: 'Within 6 Points (%)',
                            data: accuracyData.metrics.map(m => m.within_6),
                            borderColor: '#9b59b6',
                            backgroundColor: 'rgba(155, 89, 182, 0.1)',
                            borderWidth: 3,
                            fill: true
                        },
                        {
                            label: 'Within 10 Points (%)',
                            data: accuracyData.metrics.map(m => m.within_10),
                            borderColor: '#00d4ff',
                            borderWidth: 2,
                            fill: false
                        },
                        {
                            label: 'MAE (points)',
                            data: accuracyData.metrics.map(m => m.mae),
                            borderColor: '#ff6b6b',
                            borderWidth: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Accuracy (%)' }
                        },
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            title: { display: true, text: 'MAE (points)' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });

            // Table (last 15 minutes)
            const tbody = document.querySelector('#accuracy-table tbody');
            tbody.innerHTML = accuracyData.metrics
                .filter(m => m.minute >= 25)
                .map(m => {
                    const rowClass = m.within_6 >= 85 ? 'target-met' : '';
                    return `<tr class="${rowClass}">
                        <td>${m.minute}</td>
                        <td>${m.mae}</td>
                        <td>${m.within_5}%</td>
                        <td><strong>${m.within_6}%</strong></td>
                        <td>${m.within_10}%</td>
                        <td>${m.n_games}</td>
                    </tr>`;
                }).join('');
        }

        async function makePrediction() {
            const data = {
                minute: parseInt(document.getElementById('input-minute').value),
                points_so_far: parseInt(document.getElementById('input-points').value),
                poss_so_far: parseInt(document.getElementById('input-poss').value),
                score_diff: parseInt(document.getElementById('input-diff').value)
            };

            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            const p = result.projections;

            document.getElementById('prediction-result').innerHTML = `
                <div class="stat-box">
                    <div class="stat-value">${p.simple_ppm}</div>
                    <div class="stat-label">Simple PPM</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${p.possession_based}</div>
                    <div class="stat-label">Possession-Based</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value success">${p.blended}</div>
                    <div class="stat-label">Blended (V2)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${p.expected_ppm}</div>
                    <div class="stat-label">Expected PPM</div>
                </div>
            `;
        }

        // Load data on page load
        loadData();
    </script>
</body>
</html>'''

    (templates_dir / "index.html").write_text(index_html)
    print("Templates created!", flush=True)


if __name__ == '__main__':
    print("=" * 60, flush=True)
    print("HMM/KALMAN MODEL LOCAL TESTING SERVER", flush=True)
    print("=" * 60, flush=True)

    # Create templates
    create_templates()

    # Pre-load model
    print("\nPre-loading model...", flush=True)
    load_model()

    print("\n" + "=" * 60, flush=True)
    print("SERVER READY!", flush=True)
    print("Open http://localhost:8080 in your browser", flush=True)
    print("Press Ctrl+C to stop", flush=True)
    print("=" * 60, flush=True)

    app.run(host='0.0.0.0', port=8080, debug=False)
