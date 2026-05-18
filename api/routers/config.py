"""
Configuration API Router - Dynamic Configuration Management
Allows runtime configuration updates without code changes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
import json
import os
import yaml
from pathlib import Path

router = APIRouter()

CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "config.yaml"


class ConfigUpdate(BaseModel):
    key: str  # Dot notation, e.g., "action_rules.stockout.threshold_days"
    value: Any


class ConfigResponse(BaseModel):
    key: str
    value: Any
    success: bool


def load_yaml_config() -> Dict[str, Any]:
    """Load configuration from YAML file"""
    if not CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="Config file not found")
    with open(CONFIG_PATH, 'r') as f:
        return yaml.safe_load(f)


def save_yaml_config(config: Dict[str, Any]):
    """Save configuration to YAML file"""
    with open(CONFIG_PATH, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)


def get_nested(config: Dict[str, Any], key: str) -> Any:
    """Get nested value using dot notation"""
    keys = key.split('.')
    for k in keys:
        if isinstance(config, dict) and k in config:
            config = config[k]
        else:
            return None
    return config


def set_nested(config: Dict[str, Any], key: str, value: Any) -> Dict[str, Any]:
    """Set nested value using dot notation"""
    keys = key.split('.')
    current = config
    for k in keys[:-1]:
        if k not in current:
            current[k] = {}
        current = current[k]
    current[keys[-1]] = value
    return config


@router.get("/config")
def get_full_config():
    """Get the complete configuration"""
    config = load_yaml_config()
    return {"config": config}


@router.get("/config/{key}")
def get_config_value(key: str):
    """Get a specific configuration value using dot notation"""
    config = load_yaml_config()
    value = get_nested(config, key)
    if value is None:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    return {"key": key, "value": value}


@router.post("/config")
def update_config(update: ConfigUpdate):
    """Update a configuration value at runtime"""
    config = load_yaml_config()
    
    # Validate the key exists
    current = get_nested(config, update.key)
    if current is None:
        raise HTTPException(status_code=404, detail=f"Config key '{update.key}' not found")
    
    # Update the value
    config = set_nested(config, update.key, update.value)
    save_yaml_config(config)
    
    return {
        "key": update.key,
        "value": update.value,
        "success": True,
        "message": f"Updated {update.key} to {update.value}"
    }


@router.get("/config/thresholds")
def get_action_thresholds():
    """Get current action threshold values"""
    config = load_yaml_config()
    action_rules = config.get('action_rules', {})
    
    thresholds = {
        'stockout_days': action_rules.get('stockout', {}).get('threshold_days', 14),
        'overdue_high_days': action_rules.get('overdue_high', {}).get('threshold_days', 21),
        'overdue_visit_days': action_rules.get('overdue_visit', {}).get('threshold_days', 14),
        'high_score_threshold': action_rules.get('overdue_high', {}).get('min_score', 0.7),
        'standard_score_threshold': action_rules.get('standard_visit', {}).get('min_score', 0.6),
    }
    return thresholds


@router.get("/config/features")
def get_feature_config():
    """Get feature engineering configuration"""
    config = load_yaml_config()
    return config.get('features', {})


@router.post("/config/reset")
def reset_config():
    """Reset configuration to defaults (requires file to exist)"""
    # This would typically restore from a backup or default template
    return {"message": "Reset not implemented - please manually edit config.yaml"}