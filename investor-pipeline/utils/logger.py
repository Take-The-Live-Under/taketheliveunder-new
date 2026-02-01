"""Logging configuration for the pipeline."""

import logging
import sys
from pathlib import Path
from typing import Optional


def setup_logger(
    name: str = "investor_pipeline",
    level: str = "INFO",
    log_file: Optional[str] = None,
    log_format: Optional[str] = None
) -> logging.Logger:
    """
    Set up and configure logger.

    Args:
        name: Logger name
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional file path for logging
        log_format: Optional custom log format

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger

    # Set level
    level_map = {
        'DEBUG': logging.DEBUG,
        'INFO': logging.INFO,
        'WARNING': logging.WARNING,
        'ERROR': logging.ERROR,
        'CRITICAL': logging.CRITICAL,
    }
    logger.setLevel(level_map.get(level.upper(), logging.INFO))

    # Format
    if log_format is None:
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    formatter = logging.Formatter(log_format)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler (optional)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


class PipelineLogger:
    """
    Contextual logger for pipeline stages.
    """

    def __init__(self, name: str = "investor_pipeline"):
        self.logger = logging.getLogger(name)
        self.context = {}

    def set_context(self, **kwargs):
        """Set context variables that will be included in log messages."""
        self.context.update(kwargs)

    def clear_context(self):
        """Clear context variables."""
        self.context = {}

    def _format_message(self, message: str) -> str:
        """Add context to message."""
        if self.context:
            context_str = " ".join(f"[{k}={v}]" for k, v in self.context.items())
            return f"{context_str} {message}"
        return message

    def debug(self, message: str, **kwargs):
        self.set_context(**kwargs)
        self.logger.debug(self._format_message(message))

    def info(self, message: str, **kwargs):
        self.set_context(**kwargs)
        self.logger.info(self._format_message(message))

    def warning(self, message: str, **kwargs):
        self.set_context(**kwargs)
        self.logger.warning(self._format_message(message))

    def error(self, message: str, **kwargs):
        self.set_context(**kwargs)
        self.logger.error(self._format_message(message))

    def critical(self, message: str, **kwargs):
        self.set_context(**kwargs)
        self.logger.critical(self._format_message(message))

    def stage_start(self, stage_name: str):
        """Log start of a pipeline stage."""
        self.info(f"Starting stage: {stage_name}", stage=stage_name)

    def stage_complete(self, stage_name: str, count: int = 0):
        """Log completion of a pipeline stage."""
        self.info(f"Completed stage: {stage_name} (processed {count} items)", stage=stage_name, count=count)

    def stage_error(self, stage_name: str, error: Exception):
        """Log error in a pipeline stage."""
        self.error(f"Error in stage {stage_name}: {str(error)}", stage=stage_name, error=type(error).__name__)
