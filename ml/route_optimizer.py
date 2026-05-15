import pandas as pd

def suggest_route(priority_retailers: pd.DataFrame) -> list:
    """
    Groups priority retailers by tehsil, ranks tehsils by cluster score,
    returns ordered visit route.
    """
    top = priority_retailers[priority_retailers['priority'] <= 2].copy()

    if top.empty:
        top = priority_retailers[priority_retailers['priority'] <= 3].copy()

    if top.empty:
        return []

    tehsil_col = 'tehsil' if 'tehsil' in top.columns else 'visit_tehsil'

    summary = (
        top.groupby(tehsil_col)
           .agg(
               retailer_count=('retailer_id', 'count'),
               avg_score=('opportunity_score', 'mean'),
               max_score=('opportunity_score', 'max'),
           )
           .reset_index()
    )

    summary['cluster_score'] = (
        0.4 * summary['retailer_count'] / summary['retailer_count'].max() +
        0.6 * summary['avg_score']
    )
    summary = summary.sort_values('cluster_score', ascending=False)

    route = []
    for _, row in summary.iterrows():
        tehsil = row[tehsil_col]
        tehsil_retailers = (
            top[top[tehsil_col] == tehsil][
                ['retailer_id', 'opportunity_score', 'action_label', 'action_code']
            ]
            .sort_values('opportunity_score', ascending=False)
            .to_dict('records')
        )
        route.append({
            'tehsil':         tehsil,
            'retailer_count': int(row['retailer_count']),
            'avg_score':      round(float(row['avg_score']), 3),
            'cluster_score':  round(float(row['cluster_score']), 3),
            'retailers':      tehsil_retailers,
        })

    return route
