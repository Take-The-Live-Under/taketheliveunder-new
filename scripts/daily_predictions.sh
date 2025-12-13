#!/bin/bash
#
# Daily Predictions Automation Script
#
# This script automatically generates and pushes predictions to the dashboard daily.
# Run via cron job every morning at 8 AM:
#   0 8 * * * /Users/brookssawyer/Desktop/basketball-betting/scripts/daily_predictions.sh
#

set -e  # Exit on error

# Change to project directory
cd "$(dirname "$0")/.."
PROJECT_DIR=$(pwd)

# Log file
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/daily_predictions.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================="
log "Starting Daily Predictions Generation"
log "========================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    log "ERROR: python3 not found"
    exit 1
fi

# Check if API is running
API_URL="http://localhost:8000/health"
if ! curl -s "$API_URL" > /dev/null 2>&1; then
    log "WARNING: API not running at localhost:8000"
    log "Attempting to start API..."

    # Try to start API in background
    cd "$PROJECT_DIR"
    nohup python3 api/main.py > logs/api_auto.log 2>&1 &
    API_PID=$!
    log "Started API with PID: $API_PID"

    # Wait for API to be ready
    log "Waiting for API to be ready..."
    for i in {1..30}; do
        if curl -s "$API_URL" > /dev/null 2>&1; then
            log "API is ready"
            break
        fi
        sleep 1
    done

    # Check if API is actually ready
    if ! curl -s "$API_URL" > /dev/null 2>&1; then
        log "ERROR: API failed to start"
        exit 1
    fi
fi

# Run prediction generation script
log "Running push_predictions_to_dashboard.py..."
cd "$PROJECT_DIR"

if python3 push_predictions_to_dashboard.py >> "$LOG_FILE" 2>&1; then
    log "✅ Predictions generated and pushed successfully"
    SUCCESS=true
else
    log "❌ Prediction generation failed"
    SUCCESS=false
fi

# Summary
log "========================================="
if [ "$SUCCESS" = true ]; then
    log "Daily predictions completed successfully"
    log "View at: http://localhost:3002"
else
    log "Daily predictions failed - check logs"
fi
log "========================================="

exit 0
