from fastapi import APIRouter
from api.core.models import get_model

router = APIRouter()

@router.get('')
def health():
    return {
        'status':       'ok',
        'models_loaded': get_model('xgboost') is not None,
    }
