"""
Core modules for Flex Living backend
"""
from .database import db
from .config import get_settings

__all__ = ["db", "get_settings"]