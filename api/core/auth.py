from fastapi import Header, HTTPException
import os

SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    raise RuntimeError('SECRET_KEY environment variable is not set. Refusing to start.')

def verify_token(authorization: str = Header(default=None)):
    if authorization is None:
        raise HTTPException(status_code=401, detail='Authorization header missing')
    token = authorization.replace('Bearer ', '')
    if token != SECRET_KEY:
        raise HTTPException(status_code=401, detail='Invalid token')
    return token
