from fastapi import Header, HTTPException
import os

SECRET_KEY = os.getenv('SECRET_KEY', 'agripulse-hackathon-secret-key-2026')

# Simple token check for hackathon — not production JWT
def verify_token(authorization: str = Header(default=None)):
    if authorization is None:
        raise HTTPException(status_code=401, detail='Authorization header missing')
    token = authorization.replace('Bearer ', '')
    if token != SECRET_KEY:
        raise HTTPException(status_code=401, detail='Invalid token')
    return token
