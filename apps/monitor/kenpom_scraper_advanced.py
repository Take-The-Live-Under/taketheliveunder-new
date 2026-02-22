#!/usr/bin/env python3
"""
Advanced KenPom Data Scraper

Uses Selenium with undetected-chromedriver to bypass Cloudflare protection.
This is the most reliable way to get KenPom data programmatically.

Prerequisites:
    pip install selenium undetected-chromedriver pandas openpyxl

KenPom Account Required:
    - Subscription: https://kenpom.com
    - Email: Set in KENPOM_EMAIL
    - Password: Set in KENPOM_PASSWORD
"""

import os
import sys
import time
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

# Check for required packages
try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
except ImportError:
    print("ERROR: Required packages not installed")
    print("\nInstall with:")
    print("  pip install selenium undetected-chromedriver")
    sys.exit(1)

# ============================================================================
# CONFIGURATION
# ============================================================================

KENPOM_EMAIL = os.getenv("KENPOM_EMAIL", "brookssawyer@gmail.com")
KENPOM_PASSWORD = os.getenv("KENPOM_PASSWORD", "")

# Output directory
OUTPUT_DIR = Path(__file__).parent / "data" / "kenpom_historical"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Log directory
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Current season
CURRENT_SEASON = 2025


# ============================================================================
# LOGGING
# ============================================================================

class Logger:
    """Simple logger"""
    def __init__(self, log_file: Path):
        self.log_file = log_file

    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        with open(self.log_file, 'a') as f:
            f.write(log_message + "\n")


# ============================================================================
# KENPOM SCRAPER
# ============================================================================

class KenPomScraper:
    """Advanced KenPom scraper using undetected-chromedriver"""

    def __init__(self, logger: Logger):
        self.logger = logger
        self.driver = None

    def __enter__(self):
        """Context manager entry"""
        self.start_browser()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close_browser()

    def start_browser(self):
        """Initialize undetected Chrome browser"""
        self.logger.log("Starting Chrome browser (this may take a moment)...")

        options = uc.ChromeOptions()
        options.add_argument('--headless')  # Run in background
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-blink-features=AutomationControlled')

        try:
            self.driver = uc.Chrome(options=options, version_main=None)
            self.logger.log("Browser started successfully")
        except Exception as e:
            self.logger.log(f"Failed to start browser: {e}", "ERROR")
            raise

    def close_browser(self):
        """Close browser"""
        if self.driver:
            self.driver.quit()
            self.logger.log("Browser closed")

    def login(self) -> bool:
        """Login to KenPom"""
        try:
            self.logger.log("Navigating to KenPom login page...")
            self.driver.get("https://kenpom.com")

            # Wait for page load
            time.sleep(3)

            # Click login link
            self.logger.log("Looking for login link...")
            login_link = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.LINK_TEXT, "Log In"))
            )
            login_link.click()

            time.sleep(2)

            # Enter credentials
            self.logger.log("Entering credentials...")
            email_input = self.driver.find_element(By.NAME, "email")
            password_input = self.driver.find_element(By.NAME, "password")

            email_input.send_keys(KENPOM_EMAIL)
            password_input.send_keys(KENPOM_PASSWORD)

            # Submit form
            password_input.submit()

            # Wait for login to complete
            time.sleep(3)

            # Check if login successful
            if "Log Out" in self.driver.page_source:
                self.logger.log("Login successful!")
                return True
            else:
                self.logger.log("Login may have failed - checking...", "WARNING")
                return "kenpom.com" in self.driver.current_url

        except Exception as e:
            self.logger.log(f"Login failed: {e}", "ERROR")
            return False

    def scrape_ratings_table(self, year: int = CURRENT_SEASON) -> Optional[pd.DataFrame]:
        """
        Scrape the main Pomeroy Ratings table
        """
        try:
            url = f"https://kenpom.com/index.php?y={year}"
            self.logger.log(f"Fetching ratings from {url}...")

            self.driver.get(url)
            time.sleep(3)

            # Find the ratings table
            tables = pd.read_html(self.driver.page_source)

            if not tables:
                self.logger.log("No tables found on page", "ERROR")
                return None

            # The main table is usually the first or second table
            ratings_df = None
            for table in tables:
                if 'Team' in table.columns or 'Team' in str(table.iloc[0]):
                    ratings_df = table
                    break

            if ratings_df is None:
                self.logger.log("Could not find ratings table", "ERROR")
                return None

            # Clean up the dataframe
            if isinstance(ratings_df.columns, pd.MultiIndex):
                # Flatten multi-index columns
                ratings_df.columns = ['_'.join(col).strip() for col in ratings_df.columns.values]

            self.logger.log(f"Scraped {len(ratings_df)} teams from ratings table")
            return ratings_df

        except Exception as e:
            self.logger.log(f"Error scraping ratings: {e}", "ERROR")
            return None

    def scrape_all_data(self, year: int = CURRENT_SEASON) -> Dict[str, pd.DataFrame]:
        """
        Scrape all available KenPom data tables
        """
        data = {}

        # Main ratings
        self.logger.log("Scraping main Pomeroy ratings...")
        ratings = self.scrape_ratings_table(year)
        if ratings is not None:
            data['ratings'] = ratings

        # You can add more tables here:
        # - Four Factors: https://kenpom.com/stats.php?y={year}
        # - Height: https://kenpom.com/height.php?y={year}
        # - etc.

        return data


# ============================================================================
# DATA CLEANING
# ============================================================================

def clean_kenpom_data(df: pd.DataFrame, logger: Logger) -> pd.DataFrame:
    """Clean and standardize KenPom data"""
    logger.log("Cleaning KenPom data...")

    df_clean = df.copy()

    # Standardize column names
    df_clean.columns = [col.lower().replace(' ', '_').replace('.', '') for col in df_clean.columns]

    # Add metadata
    df_clean['fetch_date'] = datetime.now().strftime("%Y-%m-%d")
    df_clean['fetch_timestamp'] = datetime.now().isoformat()
    df_clean['season'] = CURRENT_SEASON
    df_clean['data_source'] = 'kenpom'

    # Remove empty rows
    df_clean = df_clean.dropna(how='all')

    logger.log(f"Cleaned data: {len(df_clean)} rows, {len(df_clean.columns)} columns")
    return df_clean


def save_data(df: pd.DataFrame, logger: Logger) -> Dict[str, Path]:
    """Save data with timestamps"""
    date_stamp = datetime.now().strftime("%Y-%m-%d")
    time_stamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")

    saved_files = {}

    # Timestamped CSV
    csv_timestamped = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.csv"
    df.to_csv(csv_timestamped, index=False)
    logger.log(f"Saved: {csv_timestamped}")
    saved_files['csv_timestamped'] = csv_timestamped

    # Date-stamped CSV
    csv_dated = OUTPUT_DIR / f"cleaned_kenpom_data_{date_stamp}.csv"
    df.to_csv(csv_dated, index=False)
    saved_files['csv_dated'] = csv_dated

    # Latest CSV
    csv_latest = OUTPUT_DIR / "cleaned_kenpom_data_latest.csv"
    df.to_csv(csv_latest, index=False)
    saved_files['csv_latest'] = csv_latest

    # Excel
    try:
        xlsx_timestamped = OUTPUT_DIR / f"cleaned_kenpom_data_{time_stamp}.xlsx"
        df.to_excel(xlsx_timestamped, index=False, engine='openpyxl')
        saved_files['xlsx_timestamped'] = xlsx_timestamped
    except Exception as e:
        logger.log(f"Could not save Excel: {e}", "WARNING")

    return saved_files


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main execution"""
    log_file = LOG_DIR / f"kenpom_scraper_{datetime.now().strftime('%Y-%m-%d')}.log"
    logger = Logger(log_file)

    logger.log("="*80)
    logger.log("KenPom Advanced Scraper Started")
    logger.log("="*80)
    logger.log(f"Email: {KENPOM_EMAIL}")
    logger.log(f"Season: {CURRENT_SEASON}")
    logger.log("="*80)

    # Check credentials
    if not KENPOM_PASSWORD:
        logger.log("ERROR: KENPOM_PASSWORD not set", "ERROR")
        logger.log("Set with: export KENPOM_PASSWORD='your_password'", "ERROR")
        return False

    try:
        # Use context manager for browser
        with KenPomScraper(logger) as scraper:
            # Login
            if not scraper.login():
                logger.log("Login failed - cannot continue", "ERROR")
                return False

            # Scrape data
            logger.log("\n" + "="*80)
            logger.log("Scraping KenPom data...")
            logger.log("="*80)

            all_data = scraper.scrape_all_data(CURRENT_SEASON)

            if not all_data:
                logger.log("No data scraped", "ERROR")
                return False

            # Process ratings table
            if 'ratings' in all_data:
                df_raw = all_data['ratings']
                df_clean = clean_kenpom_data(df_raw, logger)

                # Save
                logger.log("\n" + "="*80)
                logger.log("Saving data...")
                logger.log("="*80)

                saved_files = save_data(df_clean, logger)

                logger.log("\n" + "="*80)
                logger.log("SUCCESS!")
                logger.log("="*80)
                logger.log(f"Teams: {len(df_clean)}")
                logger.log(f"Columns: {len(df_clean.columns)}")
                logger.log("\nFiles saved:")
                for file_type, file_path in saved_files.items():
                    logger.log(f"  - {file_type}: {file_path}")
                logger.log("="*80)

                return True
            else:
                logger.log("No ratings data found", "ERROR")
                return False

    except Exception as e:
        logger.log(f"Fatal error: {e}", "ERROR")
        import traceback
        logger.log(traceback.format_exc(), "ERROR")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
