import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# Try to import Prophet, fallback to scikit-learn
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ML_Service")

app = FastAPI(title="QDSHI ML Predictive Error Forecasting Microservice")

class DefectDataPoint(BaseModel):
    date: str
    actual: Optional[float] = None

class PredictionRequest(BaseModel):
    data: List[DefectDataPoint]

class PredictionResponsePoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None
    isForecast: bool

class PredictionResponse(BaseModel):
    metrics: Dict[str, float]
    forecast: List[PredictionResponsePoint]

@app.post("/predict", response_model=PredictionResponse)
async def predict_defects(payload: PredictionRequest):
    logger.info(f"Received prediction request with {len(payload.data)} points")
    
    if not payload.data or len(payload.data) < 5:
        raise HTTPException(status_code=400, detail="Insufficient historical data points for predictive analysis")

    try:
        # 1. Parse request data to Pandas DataFrame
        raw_list = []
        for p in payload.data:
            if p.actual is not None:
                raw_list.append({"ds": p.date, "y": p.actual})
        
        df = pd.DataFrame(raw_list)
        df['ds'] = pd.to_datetime(df['ds'])
        
        # Diagnostics
        logger.info(f"Processed dataframe shape: {df.shape}")
        
        # 2. Extract metrics (rolling avg, slope, stddev) for summary calculations
        # Standard Deviation of the historical values
        std_dev = float(df['y'].std()) if len(df['y']) > 1 else 0.5
        if np.isnan(std_dev) or std_dev < 0.1:
            std_dev = 0.5
            
        # 14-day weighted rolling average
        n = len(df)
        window = min(14, n)
        weights = np.arange(1, window + 1)
        rolling_avg = float(np.average(df['y'].iloc[-window:], weights=weights)) if window > 0 else 0.0

        # Calculate slope/trend velocity using simple linear regression
        trend_window = min(30, n)
        y_trend = df['y'].iloc[-trend_window:].values
        x_trend = np.arange(trend_window).reshape(-1, 1)
        
        from sklearn.linear_model import LinearRegression
        lr = LinearRegression()
        lr.fit(x_trend, y_trend)
        trend_velocity = float(lr.coef_[0])
        # Clamp velocity to prevent runaway growth
        trend_velocity = max(-0.4, min(0.4, trend_velocity))

        # 3. Time Series Forecasting
        forecast_list = []
        
        # Try utilizing Prophet first
        prophet_success = False
        if HAS_PROPHET:
            try:
                # Prophet logger suppression
                logging.getLogger('prophet').setLevel(logging.ERROR)
                logging.getLogger('cmdstanpy').setLevel(logging.ERROR)
                
                # Fit Prophet
                model = Prophet(
                    yearly_seasonality=False,
                    weekly_seasonality=True,
                    daily_seasonality=False,
                    uncertainty_samples=1000
                )
                model.fit(df)
                
                # Make future dataframe (40 days ahead)
                future = model.make_future_dataframe(periods=40, include_history=False)
                forecast = model.predict(future)
                
                # Retrieve forecast results
                for _, row in forecast.iterrows():
                    d_str = row['ds'].strftime('%Y-%m-%d')
                    yhat = max(0.0, float(row['yhat']))
                    yhat_lower = max(0.0, float(row['yhat_lower']))
                    yhat_upper = max(0.0, float(row['yhat_upper']))
                    
                    forecast_list.append({
                        "date": d_str,
                        "actual": None,
                        "predicted": round(yhat, 2),
                        "lowerBound": round(yhat_lower, 2),
                        "upperBound": round(yhat_upper, 2),
                        "isForecast": True
                    })
                prophet_success = True
                logger.info("Successfully calculated forecast using Prophet model")
            except Exception as pe:
                logger.error(f"Prophet execution failed, falling back to scikit-learn: {str(pe)}")
        
        # Fallback to linear extrapolation if Prophet is disabled or failed
        if not prophet_success:
            logger.info("Calculating forecast using Scikit-Learn linear regression model")
            last_date = df['ds'].iloc[-1]
            
            for d in range(1, 41):
                f_date = last_date + timedelta(days=d)
                d_str = f_date.strftime('%Y-%m-%d')
                
                predicted = rolling_avg + (trend_velocity * d)
                predicted = max(0.0, float(predicted))
                
                # Error margin widens by sqrt of time ahead
                margin = 1.96 * std_dev * np.sqrt(d)
                lower_bound = max(0.0, predicted - margin)
                upper_bound = predicted + margin
                
                forecast_list.append({
                    "date": d_str,
                    "actual": None,
                    "predicted": round(predicted, 2),
                    "lowerBound": round(lower_bound, 2),
                    "upperBound": round(upper_bound, 2),
                    "isForecast": True
                })
        
        return {
            "metrics": {
                "rollingAverage": round(rolling_avg, 2),
                "trendVelocity": round(trend_velocity, 2),
                "standardDeviation": round(std_dev, 2)
            },
            "forecast": forecast_list
        }
        
    except Exception as e:
        logger.error(f"Prediction microservice failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ML service pipeline error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
