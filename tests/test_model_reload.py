import joblib

model  = joblib.load('models/xgboost_opportunity_scorer.pkl')
f_cols = joblib.load('models/feature_cols.pkl')
iso    = joblib.load('models/isolation_forest.pkl')
scaler = joblib.load('models/anomaly_scaler.pkl')
avail  = joblib.load('models/anomaly_features.pkl')
le_s   = joblib.load('models/le_state.pkl')
le_d   = joblib.load('models/le_district.pkl')
le_t   = joblib.load('models/le_tehsil.pkl')

print('XGBoost       - estimators:', model.n_estimators, '| features:', len(f_cols))
print('IsoForest     - estimators:', iso.n_estimators)
print('Scaler        - features:', len(scaler.mean_))
print('LabelEncoders - state:', len(le_s.classes_), '| district:', len(le_d.classes_), '| tehsil:', len(le_t.classes_))
print('Feature cols  :', f_cols)
print('Anomaly feats :', avail)
print('')
print('ALL MODELS RELOAD SUCCESSFULLY')
