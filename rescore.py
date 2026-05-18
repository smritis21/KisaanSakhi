"""
Run after logging visits in the app to get updated ML scores.
Visit features are calculated from today so new visits are reflected.
"""
import subprocess, sys

for script in ['pipeline/feature_engineering.py', 'ml/explain.py', 'ml/inference_pipeline.py']:
    print(f'\n>>> Running {script}...')
    result = subprocess.run([sys.executable, script])
    if result.returncode != 0:
        print(f'ERROR in {script}')
        sys.exit(1)

print('\n✅ Done. Pull to refresh in the app to see updated scores.')
