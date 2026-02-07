"""Rate limiting utilities for API calls."""

import time
import threading
from collections import deque
from functools import wraps
from typing import Callable, Optional
import logging

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Token bucket rate limiter with sliding window.

    Ensures we don't exceed API rate limits.
    """

    def __init__(self, calls_per_minute: int = 60, calls_per_second: Optional[int] = None):
        """
        Initialize rate limiter.

        Args:
            calls_per_minute: Maximum calls allowed per minute
            calls_per_second: Maximum calls allowed per second (optional)
        """
        self.calls_per_minute = calls_per_minute
        self.calls_per_second = calls_per_second or (calls_per_minute // 60 + 1)

        self.minute_window = deque()
        self.second_window = deque()
        self.lock = threading.Lock()

    def _clean_windows(self, current_time: float):
        """Remove expired timestamps from windows."""
        minute_ago = current_time - 60
        second_ago = current_time - 1

        while self.minute_window and self.minute_window[0] < minute_ago:
            self.minute_window.popleft()

        while self.second_window and self.second_window[0] < second_ago:
            self.second_window.popleft()

    def acquire(self, timeout: float = 60.0) -> bool:
        """
        Acquire permission to make an API call.

        Blocks until a slot is available or timeout is reached.

        Args:
            timeout: Maximum time to wait for a slot

        Returns:
            True if acquired, False if timeout
        """
        start_time = time.time()

        while True:
            with self.lock:
                current_time = time.time()
                self._clean_windows(current_time)

                # Check both limits
                minute_ok = len(self.minute_window) < self.calls_per_minute
                second_ok = len(self.second_window) < self.calls_per_second

                if minute_ok and second_ok:
                    self.minute_window.append(current_time)
                    self.second_window.append(current_time)
                    return True

            # Check timeout
            if time.time() - start_time >= timeout:
                logger.warning("Rate limiter timeout reached")
                return False

            # Calculate wait time
            if not minute_ok and self.minute_window:
                wait_time = 60 - (time.time() - self.minute_window[0]) + 0.1
            elif not second_ok and self.second_window:
                wait_time = 1 - (time.time() - self.second_window[0]) + 0.05
            else:
                wait_time = 0.1

            time.sleep(min(wait_time, 1.0))

    def wait(self):
        """Simple wait that always acquires (blocks until available)."""
        self.acquire(timeout=300)


def rate_limited(calls_per_minute: int = 60):
    """
    Decorator to rate limit a function.

    Usage:
        @rate_limited(calls_per_minute=10)
        def my_api_call():
            ...
    """
    limiter = RateLimiter(calls_per_minute=calls_per_minute)

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            limiter.wait()
            return func(*args, **kwargs)
        return wrapper
    return decorator


class AdaptiveRateLimiter(RateLimiter):
    """
    Rate limiter that adapts based on API response headers.

    Automatically adjusts rate when receiving 429 responses.
    """

    def __init__(self, initial_calls_per_minute: int = 60):
        super().__init__(calls_per_minute=initial_calls_per_minute)
        self.initial_rate = initial_calls_per_minute
        self.backoff_factor = 0.5
        self.recovery_factor = 1.1
        self.min_rate = 1
        self.max_rate = initial_calls_per_minute * 2

    def on_rate_limited(self, retry_after: Optional[int] = None):
        """
        Called when we receive a 429 response.

        Args:
            retry_after: Retry-After header value in seconds
        """
        with self.lock:
            if retry_after:
                logger.warning(f"Rate limited. Waiting {retry_after} seconds.")
                time.sleep(retry_after)
            else:
                # Reduce rate
                new_rate = max(self.min_rate, int(self.calls_per_minute * self.backoff_factor))
                logger.warning(f"Rate limited. Reducing rate from {self.calls_per_minute} to {new_rate}")
                self.calls_per_minute = new_rate

    def on_success(self):
        """Called on successful API response. Gradually increase rate."""
        with self.lock:
            if self.calls_per_minute < self.initial_rate:
                new_rate = min(self.max_rate, int(self.calls_per_minute * self.recovery_factor))
                if new_rate != self.calls_per_minute:
                    logger.debug(f"Recovering rate from {self.calls_per_minute} to {new_rate}")
                    self.calls_per_minute = new_rate


class RateLimiterPool:
    """
    Pool of rate limiters for different API endpoints.
    """

    def __init__(self):
        self.limiters = {}
        self.lock = threading.Lock()

    def get(self, name: str, calls_per_minute: int = 60) -> RateLimiter:
        """
        Get or create a rate limiter for a named endpoint.

        Args:
            name: Unique name for the endpoint
            calls_per_minute: Rate limit if creating new limiter

        Returns:
            RateLimiter instance
        """
        with self.lock:
            if name not in self.limiters:
                self.limiters[name] = AdaptiveRateLimiter(calls_per_minute)
            return self.limiters[name]


# Global pool instance
rate_limiter_pool = RateLimiterPool()
