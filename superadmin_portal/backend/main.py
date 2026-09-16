import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("superadmin_portal")

# Load environment variables
# Look for local .env, then fallback to root backend/.env
local_env = os.path.join(os.path.dirname(__file__), ".env")
root_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend/.env"))

if os.path.exists(local_env):
    logger.info(f"Loading environment from local env: {local_env}")
    load_dotenv(local_env)
elif os.path.exists(root_backend_env):
    logger.info(f"Loading environment from root backend env: {root_backend_env}")
    load_dotenv(root_backend_env)
else:
    logger.info("No .env file found, relying on system environment variables.")

# Read config variables
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "test"  # Default fallback database

# Initialize MongoDB Client using Motor
db_client = None
db = None

try:
    db_client = AsyncIOMotorClient(MONGO_URI)
    # Extract DB name from URI if specified (e.g. mongodb+srv://host/dbname?args)
    # Split the main parts to extract DB path
    clean_uri = MONGO_URI.split("?")[0]
    if "/" in clean_uri.split("://")[-1]:
        path_db = clean_uri.split("/")[-1]
        if path_db:
            DB_NAME = path_db
    
    db = db_client[DB_NAME]
    logger.info(f"Using MongoDB Database: {DB_NAME}")
except Exception as e:
    logger.error(f"Error initializing MongoDB client: {e}")

app = FastAPI(
    title="SuperAdmin Portal Standalone Backend",
    description="Analytics & In-App Mail Dispatch API for Industrial management",
    version="1.0.0"
)

# CORS configuration to allow all requests from local development frontend
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    # Verify MongoDB connection
    try:
        if db_client:
            await db_client.admin.command('ping')
            logger.info("✅ MongoDB connected successfully!")
        else:
            logger.warning("⚠️ MongoDB client not initialized.")
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")

# Include routers - imports deferred to avoid circular dependency
from routers import chatbot_analytics, mail_dispatch

app.include_router(chatbot_analytics.router, prefix="/api/v1/admin")
app.include_router(mail_dispatch.router, prefix="/api/v1/admin")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "module": "SuperAdmin Chatbot Analytics & In-App Mail Dispatch Module",
        "database_connected": db is not None,
        "database_name": DB_NAME
    }
