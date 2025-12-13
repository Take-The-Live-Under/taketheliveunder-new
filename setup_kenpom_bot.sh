#!/bin/bash
# KenPom Bot Setup Script

echo "=========================================="
echo "KenPom Data Collection Bot - Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version || { echo "Error: Python 3 not found"; exit 1; }
echo "✓ Python 3 found"
echo ""

# Install required packages
echo "Installing required Python packages..."
pip3 install kenpompy pandas openpyxl requests || { echo "Error installing packages"; exit 1; }
echo "✓ Packages installed"
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p data/kenpom_historical
mkdir -p logs
echo "✓ Directories created"
echo ""

# Make scheduler executable
echo "Setting up scheduler script..."
chmod +x schedule_kenpom_bot.sh
echo "✓ Scheduler script ready"
echo ""

# Prompt for KenPom password
echo "=========================================="
echo "KenPom Credentials Setup"
echo "=========================================="
echo ""
echo "Your KenPom email: brookssawyer@gmail.com"
echo ""
read -sp "Enter your KenPom password: " KENPOM_PASS
echo ""
echo ""

# Update .env file
if [ -f .env ]; then
    # Remove old KENPOM_PASSWORD if exists
    grep -v "KENPOM_PASSWORD=" .env > .env.tmp
    mv .env.tmp .env
fi

# Add new password
echo "KENPOM_PASSWORD=$KENPOM_PASS" >> .env
echo "✓ Password saved to .env file"
echo ""

# Update schedule script with password
sed -i.bak "s/YOUR_KENPOM_PASSWORD_HERE/$KENPOM_PASS/" schedule_kenpom_bot.sh
rm -f schedule_kenpom_bot.sh.bak
echo "✓ Scheduler script updated"
echo ""

# Test the bot
echo "=========================================="
echo "Testing Bot"
echo "=========================================="
echo ""
echo "Running test fetch (this may take 30-60 seconds)..."
export KENPOM_PASSWORD="$KENPOM_PASS"
python3 kenpom_data_bot.py

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✓ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Run manually anytime:"
    echo "   python3 kenpom_data_bot.py"
    echo ""
    echo "2. Schedule for daily runs (2 AM):"
    echo "   (crontab -l 2>/dev/null; echo \"0 2 * * * cd $(pwd) && ./schedule_kenpom_bot.sh >> logs/kenpom_bot_cron.log 2>&1\") | crontab -"
    echo ""
    echo "3. View latest data:"
    echo "   ls -lh data/kenpom_historical/"
    echo ""
    echo "4. View logs:"
    echo "   cat logs/kenpom_bot_$(date +%Y-%m-%d).log"
    echo ""
else
    echo ""
    echo "=========================================="
    echo "⚠ Setup completed but test failed"
    echo "=========================================="
    echo ""
    echo "Check the log file for errors:"
    echo "   cat logs/kenpom_bot_$(date +%Y-%m-%d).log"
    echo ""
    echo "Common issues:"
    echo "  - Wrong KenPom password"
    echo "  - KenPom subscription expired"
    echo "  - Internet connection issue"
    echo ""
fi
