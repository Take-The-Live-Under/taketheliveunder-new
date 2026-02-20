"""
Daily Performance Report Generator
Analyzes betting performance and sends email summary
"""
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from loguru import logger
import config


class DailyReportGenerator:
    """Generates and emails daily performance reports"""

    def __init__(self):
        self.results_file = config.RESULTS_FILE
        self.live_log_file = config.LIVE_LOG_FILE

    def analyze_yesterday(self) -> Dict:
        """
        Analyze betting performance from yesterday

        Returns dict with:
        - games_analyzed: Total games with triggers
        - total_triggers: Number of bet recommendations
        - wins: Number of winning bets
        - losses: Number of losing bets
        - win_rate: Percentage of wins
        - total_units_risked: Total units wagered
        - total_units_profit: Net profit/loss
        - roi: Return on investment %
        - by_confidence: Breakdown by confidence tier
        - by_bet_type: Breakdown by over/under
        - best_games: Top performing bets
        - worst_games: Worst performing bets
        """
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

        try:
            # Load results data
            if not self.results_file.exists():
                logger.warning(f"Results file not found: {self.results_file}")
                return self._empty_analysis()

            results_df = pd.read_csv(self.results_file)

            # Filter to yesterday's games
            results_df['date'] = pd.to_datetime(results_df['date'])
            yesterday_games = results_df[results_df['date'].dt.strftime("%Y-%m-%d") == yesterday]

            if yesterday_games.empty:
                logger.info(f"No games found for {yesterday}")
                return self._empty_analysis()

            # Only analyze games where we had a trigger
            triggered_games = yesterday_games[yesterday_games['our_trigger'].notna() & (yesterday_games['our_trigger'] != '')]

            if triggered_games.empty:
                logger.info(f"No triggered games for {yesterday}")
                return self._empty_analysis()

            # Calculate overall stats
            total_triggers = len(triggered_games)
            wins = len(triggered_games[triggered_games['outcome'] == 'win'])
            losses = len(triggered_games[triggered_games['outcome'] == 'loss'])
            pushes = len(triggered_games[triggered_games['outcome'] == 'push'])

            win_rate = (wins / total_triggers * 100) if total_triggers > 0 else 0

            total_units_risked = triggered_games['max_units'].sum()
            total_units_profit = triggered_games['unit_profit'].sum()
            roi = (total_units_profit / total_units_risked * 100) if total_units_risked > 0 else 0

            # Breakdown by confidence tier
            def get_confidence_tier(score):
                if score >= 86: return 'MAX'
                if score >= 76: return 'HIGH'
                if score >= 61: return 'MEDIUM'
                if score >= 41: return 'LOW'
                return 'NO BET'

            triggered_games['tier'] = triggered_games['max_confidence'].apply(get_confidence_tier)
            by_confidence = triggered_games.groupby('tier').agg({
                'outcome': lambda x: (x == 'win').sum(),
                'max_units': 'sum',
                'unit_profit': 'sum'
            }).to_dict('index')

            # Breakdown by bet type
            by_bet_type = triggered_games.groupby('our_trigger').agg({
                'outcome': lambda x: (x == 'win').sum(),
                'max_units': 'sum',
                'unit_profit': 'sum'
            }).to_dict('index')

            # Best and worst games
            best_games = triggered_games.nlargest(3, 'unit_profit')[[
                'home_team', 'away_team', 'our_trigger', 'max_confidence',
                'max_units', 'unit_profit', 'outcome'
            ]].to_dict('records')

            worst_games = triggered_games.nsmallest(3, 'unit_profit')[[
                'home_team', 'away_team', 'our_trigger', 'max_confidence',
                'max_units', 'unit_profit', 'outcome'
            ]].to_dict('records')

            return {
                'date': yesterday,
                'games_analyzed': len(yesterday_games),
                'total_triggers': total_triggers,
                'wins': wins,
                'losses': losses,
                'pushes': pushes,
                'win_rate': round(win_rate, 1),
                'total_units_risked': round(total_units_risked, 2),
                'total_units_profit': round(total_units_profit, 2),
                'roi': round(roi, 1),
                'by_confidence': by_confidence,
                'by_bet_type': by_bet_type,
                'best_games': best_games,
                'worst_games': worst_games
            }

        except Exception as e:
            logger.error(f"Error analyzing yesterday's data: {e}")
            return self._empty_analysis()

    def _empty_analysis(self) -> Dict:
        """Return empty analysis structure"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        return {
            'date': yesterday,
            'games_analyzed': 0,
            'total_triggers': 0,
            'wins': 0,
            'losses': 0,
            'pushes': 0,
            'win_rate': 0,
            'total_units_risked': 0,
            'total_units_profit': 0,
            'roi': 0,
            'by_confidence': {},
            'by_bet_type': {},
            'best_games': [],
            'worst_games': []
        }

    def generate_html_report(self, analysis: Dict) -> str:
        """Generate HTML email report"""

        profit_color = "green" if analysis['total_units_profit'] > 0 else "red"
        profit_symbol = "+" if analysis['total_units_profit'] > 0 else ""

        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }}
                .container {{ max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                h1 {{ color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }}
                h2 {{ color: #555; margin-top: 30px; }}
                .stats-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }}
                .stat-card {{ background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50; }}
                .stat-label {{ font-size: 14px; color: #666; margin-bottom: 5px; }}
                .stat-value {{ font-size: 28px; font-weight: bold; color: #333; }}
                .profit {{ color: {profit_color}; }}
                .breakdown {{ margin: 20px 0; }}
                .breakdown-item {{ background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .game-card {{ background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #2196F3; }}
                .badge {{ display: inline-block; padding: 5px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; }}
                .badge-win {{ background: #4CAF50; color: white; }}
                .badge-loss {{ background: #f44336; color: white; }}
                .badge-push {{ background: #FF9800; color: white; }}
                .badge-over {{ background: #4CAF50; color: white; }}
                .badge-under {{ background: #2196F3; color: white; }}
                table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #4CAF50; color: white; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🏀 Daily Betting Performance Report</h1>
                <p><strong>Date:</strong> {analysis['date']}</p>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Total Triggers</div>
                        <div class="stat-value">{analysis['total_triggers']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Win Rate</div>
                        <div class="stat-value">{analysis['win_rate']}%</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Units Profit/Loss</div>
                        <div class="stat-value profit">{profit_symbol}{analysis['total_units_profit']}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">ROI</div>
                        <div class="stat-value profit">{profit_symbol}{analysis['roi']}%</div>
                    </div>
                </div>

                <div class="breakdown">
                    <p><strong>Record:</strong> {analysis['wins']}-{analysis['losses']}-{analysis['pushes']}</p>
                    <p><strong>Units Risked:</strong> {analysis['total_units_risked']}</p>
                </div>
"""

        # Breakdown by bet type
        if analysis['by_bet_type']:
            html += "<h2>📊 Performance by Bet Type</h2><table><tr><th>Type</th><th>Wins</th><th>Units</th><th>Profit</th></tr>"
            for bet_type, stats in analysis['by_bet_type'].items():
                html += f"<tr><td><span class='badge badge-{bet_type.lower()}'>{bet_type.upper()}</span></td><td>{stats['outcome']}</td><td>{stats['max_units']:.1f}</td><td class='profit'>{profit_symbol if stats['unit_profit'] > 0 else ''}{stats['unit_profit']:.2f}</td></tr>"
            html += "</table>"

        # Breakdown by confidence
        if analysis['by_confidence']:
            html += "<h2>🎯 Performance by Confidence Tier</h2><table><tr><th>Tier</th><th>Wins</th><th>Units</th><th>Profit</th></tr>"
            for tier, stats in analysis['by_confidence'].items():
                html += f"<tr><td>{tier}</td><td>{stats['outcome']}</td><td>{stats['max_units']:.1f}</td><td class='profit'>{profit_symbol if stats['unit_profit'] > 0 else ''}{stats['unit_profit']:.2f}</td></tr>"
            html += "</table>"

        # Best games
        if analysis['best_games']:
            html += "<h2>✅ Best Performing Bets</h2>"
            for game in analysis['best_games']:
                outcome_class = f"badge-{game['outcome']}"
                html += f"""
                <div class="game-card">
                    <strong>{game['home_team']} vs {game['away_team']}</strong><br>
                    <span class='badge badge-{game['our_trigger'].lower()}'>{game['our_trigger'].upper()}</span>
                    <span class='badge {outcome_class}'>{game['outcome'].upper()}</span><br>
                    Confidence: {game['max_confidence']}/100 | Units: {game['max_units']} | Profit: <strong class='profit'>{profit_symbol if game['unit_profit'] > 0 else ''}{game['unit_profit']:.2f}</strong>
                </div>
                """

        # Worst games
        if analysis['worst_games']:
            html += "<h2>❌ Worst Performing Bets</h2>"
            for game in analysis['worst_games']:
                outcome_class = f"badge-{game['outcome']}"
                html += f"""
                <div class="game-card">
                    <strong>{game['home_team']} vs {game['away_team']}</strong><br>
                    <span class='badge badge-{game['our_trigger'].lower()}'>{game['our_trigger'].upper()}</span>
                    <span class='badge {outcome_class}'>{game['outcome'].upper()}</span><br>
                    Confidence: {game['max_confidence']}/100 | Units: {game['max_units']} | Profit: <strong class='profit'>{game['unit_profit']:.2f}</strong>
                </div>
                """

        html += """
                <div class="footer">
                    <p>🤖 Generated by NCAA Basketball Live Betting Monitor</p>
                    <p>This is an automated report. Stay disciplined and bet responsibly!</p>
                </div>
            </div>
        </body>
        </html>
        """

        return html

    def send_email(self, subject: str, html_content: str):
        """Send email via SMTP"""
        if not config.EMAIL_ENABLED:
            logger.info("Email disabled in config, skipping send")
            return False

        if not config.EMAIL_TO or not config.EMAIL_FROM or not config.EMAIL_PASSWORD:
            logger.error("Email configuration incomplete")
            return False

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = config.EMAIL_FROM
            msg['To'] = config.EMAIL_TO

            # Attach HTML
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            # Send via SMTP
            with smtplib.SMTP(config.EMAIL_SMTP_SERVER, config.EMAIL_SMTP_PORT) as server:
                server.starttls()
                server.login(config.EMAIL_FROM, config.EMAIL_PASSWORD)
                server.send_message(msg)

            logger.success(f"Email sent successfully to {config.EMAIL_TO}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def generate_and_send_daily_report(self):
        """Main function to analyze and send daily report"""
        logger.info("Generating daily performance report...")

        # Analyze yesterday's performance
        analysis = self.analyze_yesterday()

        # Generate HTML report
        html_content = self.generate_html_report(analysis)

        # Create subject line
        yesterday = analysis['date']
        subject = f"🏀 Daily Betting Report - {yesterday} | {analysis['wins']}-{analysis['losses']}-{analysis['pushes']} | {analysis['total_units_profit']:+.2f}u"

        # Send email
        success = self.send_email(subject, html_content)

        if success:
            logger.success(f"Daily report sent for {yesterday}")
        else:
            logger.warning(f"Daily report generated but not sent for {yesterday}")

        return analysis


# Singleton instance
_report_generator = None

def get_report_generator() -> DailyReportGenerator:
    """Get singleton report generator instance"""
    global _report_generator
    if _report_generator is None:
        _report_generator = DailyReportGenerator()
    return _report_generator
