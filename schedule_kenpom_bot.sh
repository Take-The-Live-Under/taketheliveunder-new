#!/bin/bash
# KenPom Data Bot Scheduler
# Add this to crontab for automated daily runs

# Set environment variables
export KENPOM_EMAIL="brookssawyer@gmail.com"
export KENPOM_PASSWORD="YOUR_KENPOM_PASSWORD_HERE"

# Change to script directory
cd "$(dirname "$0")"

# Run the bot
python3 kenpom_data_bot.py

# Exit with the bot's exit code
exit $?
