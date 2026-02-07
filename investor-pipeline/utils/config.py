"""Configuration loader with environment variable substitution."""

import os
import re
import yaml
from pathlib import Path
from typing import Any, Dict, Optional


def load_config(config_path: str = "config.yaml") -> Dict[str, Any]:
    """
    Load configuration from YAML file with environment variable substitution.

    Environment variables are referenced as ${VAR_NAME} in the YAML file.
    """
    config_file = Path(config_path)

    if not config_file.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_file, 'r') as f:
        content = f.read()

    # Substitute environment variables
    env_pattern = re.compile(r'\$\{([^}]+)\}')

    def replace_env_var(match):
        var_name = match.group(1)
        value = os.environ.get(var_name, '')
        return value

    content = env_pattern.sub(replace_env_var, content)

    config = yaml.safe_load(content)
    return config


def get_api_key(config: Dict[str, Any], key_name: str) -> Optional[str]:
    """
    Get an API key from config, with fallback to environment variable.

    Args:
        config: Loaded configuration dictionary
        key_name: Name of the API key (e.g., 'hunter_api_key')

    Returns:
        API key string or None if not found
    """
    # Try config first
    api_keys = config.get('api_keys', {})
    key_value = api_keys.get(key_name, '')

    if key_value:
        return key_value

    # Fallback to environment variable directly
    env_var = key_name.upper()
    return os.environ.get(env_var)


def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validate that required configuration fields are present.

    Args:
        config: Loaded configuration dictionary

    Returns:
        True if valid, raises ValueError otherwise
    """
    required_fields = [
        'pipeline.daily_goal',
        'pipeline.total_days',
        'geography.country',
        'keywords.primary',
        'seed_companies',
        'target_titles',
    ]

    for field in required_fields:
        parts = field.split('.')
        value = config
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                raise ValueError(f"Missing required configuration field: {field}")

    return True


class ConfigManager:
    """Singleton configuration manager."""

    _instance = None
    _config = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load(self, config_path: str = "config.yaml") -> Dict[str, Any]:
        """Load and cache configuration."""
        if self._config is None:
            self._config = load_config(config_path)
            validate_config(self._config)
        return self._config

    @property
    def config(self) -> Dict[str, Any]:
        """Get cached configuration."""
        if self._config is None:
            self.load()
        return self._config

    def get(self, key_path: str, default: Any = None) -> Any:
        """
        Get a configuration value by dot-notation path.

        Example: config_manager.get('pipeline.daily_goal')
        """
        parts = key_path.split('.')
        value = self.config
        for part in parts:
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                return default
        return value
