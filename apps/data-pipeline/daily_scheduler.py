"""
Daily Report Scheduler
Runs daily performance analysis and emails report each morning
"""
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
from loguru import logger
import sys

import config
from utils.daily_report import get_report_generator


class DailyScheduler:
    """Schedules and runs daily performance reports"""

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.report_generator = get_report_generator()

        # Parse report time (HH:MM format)
        try:
            hour, minute = config.DAILY_REPORT_TIME.split(":")
            self.report_hour = int(hour)
            self.report_minute = int(minute)
        except:
            logger.warning(f"Invalid DAILY_REPORT_TIME format: {config.DAILY_REPORT_TIME}, using 09:00")
            self.report_hour = 9
            self.report_minute = 0

    def run_daily_report(self):
        """Execute the daily report"""
        try:
            logger.info("=" * 80)
            logger.info("Running scheduled daily performance report")
            logger.info("=" * 80)

            analysis = self.report_generator.generate_and_send_daily_report()

            logger.info(f"Report complete: {analysis['wins']}-{analysis['losses']}-{analysis['pushes']}, "
                       f"{analysis['total_units_profit']:+.2f} units profit")

        except Exception as e:
            logger.error(f"Error running daily report: {e}")

    def start(self):
        """Start the scheduler"""
        # Schedule daily report
        trigger = CronTrigger(hour=self.report_hour, minute=self.report_minute)
        self.scheduler.add_job(
            self.run_daily_report,
            trigger=trigger,
            id='daily_report',
            name='Daily Performance Report',
            replace_existing=True
        )

        logger.info(f"Daily report scheduler started")
        logger.info(f"Report will be sent daily at {self.report_hour:02d}:{self.report_minute:02d}")

        if config.EMAIL_ENABLED:
            logger.info(f"Email reports enabled - sending to {config.EMAIL_TO}")
        else:
            logger.warning("Email reports disabled in config")

        self.scheduler.start()
        logger.success("Scheduler is running. Press Ctrl+C to exit.")

    async def run_forever(self):
        """Keep the scheduler running"""
        try:
            # Keep the event loop running
            while True:
                await asyncio.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down scheduler...")
            self.scheduler.shutdown()


async def main():
    """Main entry point"""
    logger.remove()
    logger.add(sys.stderr, level=config.LOG_LEVEL)
    logger.add(config.LOG_FILE, rotation="1 day", retention="30 days", level="INFO")

    logger.info("=" * 80)
    logger.info("Daily Report Scheduler - NCAA Basketball Betting Monitor")
    logger.info("=" * 80)

    scheduler = DailyScheduler()
    scheduler.start()

    # Option to run report immediately for testing
    if len(sys.argv) > 1 and sys.argv[1] == "--now":
        logger.info("Running report immediately (--now flag)")
        scheduler.run_daily_report()
    else:
        await scheduler.run_forever()


if __name__ == "__main__":
    asyncio.run(main())
