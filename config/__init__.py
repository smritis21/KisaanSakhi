"""
AgriPulse AI - Dynamic Configuration Loader
Loads config.yaml and supports environment variable overrides
"""
import os
import yaml
import re
from pathlib import Path
from typing import Any, Dict, Optional

# Auto-load .env from project root
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip())

_config: Optional[Dict[str, Any]] = None
_config_path = Path(__file__).parent / "config.yaml"


def _resolve_env_vars(value: Any) -> Any:
    """Recursively resolve environment variable placeholders like ${VAR_NAME:default}"""
    if isinstance(value, str):
        # Match ${VAR_NAME:default} or ${VAR_NAME}
        pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'
        
        def replace(match):
            var_name = match.group(1)
            default = match.group(2) if match.group(2) is not None else ''
            return os.getenv(var_name, default)
        
        return re.sub(pattern, replace, value)
    elif isinstance(value, dict):
        return {k: _resolve_env_vars(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_resolve_env_vars(item) for item in value]
    return value


def load_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load configuration from YAML file with environment variable resolution"""
    global _config
    
    if _config is not None:
        return _config
    
    path = config_path or _config_path
    
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
    
    with open(path, 'r') as f:
        raw_config = yaml.safe_load(f)
    
    _config = _resolve_env_vars(raw_config)
    return _config


def get_config() -> Dict[str, Any]:
    """Get the loaded configuration, loading if necessary"""
    global _config
    if _config is None:
        return load_config()
    return _config


def get(key: str, default: Any = None) -> Any:
    """
    Get a configuration value using dot notation.
    Example: get('database.host') or get('ml.xgboost_model')
    """
    config = get_config()
    keys = key.split('.')
    
    for k in keys:
        if isinstance(config, dict) and k in config:
            config = config[k]
        else:
            return default
    
    return config


def reload(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Force reload configuration from file"""
    global _config
    _config = None
    return load_config(config_path)


# Convenience getters for common values
def get_database_url() -> str:
    """Get SQLAlchemy database URL — env var takes priority"""
    env_url = os.getenv('DATABASE_URL')
    if env_url:
        return env_url
    db = get('database', {})
    return f"postgresql://{db.get('user', 'agripulse')}:{db.get('password', 'agripulse123')}@{db.get('host', 'localhost')}:{db.get('port', 5432)}/{db.get('name', 'agripulse')}"


def get_api_base_url() -> str:
    """Get API base URL"""
    return get('api.base_url', 'http://localhost:8000/api/v1')


def get_default_rep_id() -> str:
    """Get default rep ID for mobile app"""
    return get('mobile.default_rep_id', 'REP_0001')


def get_action_rules() -> Dict[str, Any]:
    """Get next best action rules configuration"""
    return get('action_rules', {})


def get_feature_config() -> Dict[str, Any]:
    """Get feature engineering configuration"""
    return get('features', {})


def get_shap_config() -> Dict[str, Any]:
    """Get SHAP explanation configuration"""
    return get('shap', {})


if __name__ == '__main__':
    # Test configuration loading
    config = load_config()
    print("Configuration loaded successfully!")
    print(f"App: {config.get('app', {}).get('name')}")
    print(f"Database: {get_database_url()}")
    print(f"Default Rep ID: {get_default_rep_id()}")
    print(f"Action Rules: {list(get_action_rules().keys())}")