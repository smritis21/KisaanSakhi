from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import reps, retailers, sync, health, config
from api.core.models import load_models
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

app = FastAPI(
    title='AgriPulse AI',
    description='AI-Guided Field Force Intelligence — Syngenta × IITM BS Hackathon 2026',
    version='1.0.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.on_event('startup')
async def startup():
    load_models()

app.include_router(reps.router,      prefix='/api/v1/reps',      tags=['Reps'])
app.include_router(retailers.router, prefix='/api/v1/retailers', tags=['Retailers'])
app.include_router(sync.router,      prefix='/api/v1/sync',      tags=['Sync'])
app.include_router(health.router,    prefix='/api/v1/health',    tags=['Health'])
app.include_router(config.router,    prefix='/api/v1/config',    tags=['Config'])

@app.get('/')
def root():
    return {'message': 'AgriPulse AI is running', 'docs': '/docs'}
