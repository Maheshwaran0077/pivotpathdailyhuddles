import os
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
import pytz
import logging

logger = logging.getLogger("superadmin_portal.chatbot_analytics")
router = APIRouter()

# Department configurations and labels
DEPT_CONFIG = {
    "fgmw": "Finished Goods Warehouse",
    "pmw": "Packing Material Warehouse",
    "rmw": "Raw Material Warehouse",
    "ppp": "Primary Packing Production",
    "pop": "Post Production",
    "qcmad": "QC & Microbiology Lab",
    "pro": "Production",
    "spp": "Secondary Packing Production",
    "fac": "Facilities"
}

# Fallback HODs details
FALLBACK_HODS = {
    "fgmw": {"name": "Karthik Raja", "email": "karthik.raja@arcolab.com"},
    "pmw": {"name": "Ramesh Patel", "email": "ramesh.patel@arcolab.com"},
    "rmw": {"name": "Amit Sharma", "email": "amit.sharma@arcolab.com"},
    "ppp": {"name": "Sanjay Mehta", "email": "sanjay.mehta@arcolab.com"},
    "pop": {"name": "Dr. Mahesh Kumar", "email": "mahesh.kumar@arcolab.com"},
    "qcmad": {"name": "Vikram Malhotra", "email": "vikram.malhotra@arcolab.com"},
    "pro": {"name": "Dr. Ananya Iyer", "email": "ananya.iyer@arcolab.com"},
    "spp": {"name": "Suresh Raina", "email": "suresh.raina@arcolab.com"},
    "fac": {"name": "Preeti Singh", "email": "preeti.singh@arcolab.com"}
}

# Fallback Supervisors details mapping by department
FALLBACK_SUPERVISORS = {
    "fgmw": [
        {"name": "Mageshwaran K", "email": "mageshedu77@gmail.com", "employeeId": "EMP-FG01", "shift": "1"},
        {"name": "Sarah Connor", "email": "sarah.c@arcolab.com", "employeeId": "EMP-FG02", "shift": "2"}
    ],
    "pmw": [
        {"name": "David Miller", "email": "david.m@arcolab.com", "employeeId": "EMP-PM01", "shift": "1"},
        {"name": "Emma Watson", "email": "emma.w@arcolab.com", "employeeId": "EMP-PM02", "shift": "2"}
    ],
    "rmw": [
        {"name": "James Bond", "email": "james.b@arcolab.com", "employeeId": "EMP-RM01", "shift": "1"},
        {"name": "Robert Downey", "email": "robert.d@arcolab.com", "employeeId": "EMP-RM02", "shift": "3"}
    ],
    "ppp": [
        {"name": "Tony Stark", "email": "tony.s@arcolab.com", "employeeId": "EMP-PP01", "shift": "1"},
        {"name": "Bruce Banner", "email": "bruce.b@arcolab.com", "employeeId": "EMP-PP02", "shift": "2"},
        {"name": "Natasha Romanoff", "email": "natasha.r@arcolab.com", "employeeId": "EMP-PP03", "shift": "3"}
    ],
    "pop": [
        {"name": "Steve Rogers", "email": "steve.r@arcolab.com", "employeeId": "EMP-PO01", "shift": "1"},
        {"name": "Thor Odinson", "email": "thor.o@arcolab.com", "employeeId": "EMP-PO02", "shift": "2"}
    ],
    "qcmad": [
        {"name": "Peter Parker", "email": "peter.p@arcolab.com", "employeeId": "EMP-QC01", "shift": "1"},
        {"name": "Wanda Maximoff", "email": "wanda.m@arcolab.com", "employeeId": "EMP-QC02", "shift": "2"}
    ],
    "pro": [
        {"name": "Clint Barton", "email": "clint.b@arcolab.com", "employeeId": "EMP-PR01", "shift": "1"},
        {"name": "Scott Lang", "email": "scott.l@arcolab.com", "employeeId": "EMP-PR02", "shift": "2"},
        {"name": "Stephen Strange", "email": "stephen.s@arcolab.com", "employeeId": "EMP-PR03", "shift": "3"}
    ],
    "spp": [
        {"name": "Carol Danvers", "email": "carol.d@arcolab.com", "employeeId": "EMP-SP01", "shift": "1"},
        {"name": "T'Challa King", "email": "tchalla.k@arcolab.com", "employeeId": "EMP-SP02", "shift": "2"}
    ],
    "fac": [
        {"name": "Sam Wilson", "email": "sam.w@arcolab.com", "employeeId": "EMP-FC01", "shift": "1"}
    ]
}

# Prepopulated fallback mock data for today's telemetry (when DB has no records for the current day)
FALLBACK_METRICS = {
    "ppp": {"alerts": 4, "success": 2, "errors": 1, "risk": "Red"},
    "pro": {"alerts": 3, "success": 5, "errors": 2, "risk": "Red"},
    "pmw": {"alerts": 2, "success": 6, "errors": 0, "risk": "Orange"},
    "qcmad": {"alerts": 2, "success": 8, "errors": 1, "risk": "Orange"},
    "rmw": {"alerts": 1, "success": 7, "errors": 0, "risk": "Amber"},
    "fgmw": {"alerts": 1, "success": 8, "errors": 0, "risk": "Amber"},
    "pop": {"alerts": 0, "success": 9, "errors": 0, "risk": "Green"},
    "fac": {"alerts": 0, "success": 10, "errors": 0, "risk": "Green"},
    "spp": {"alerts": 0, "success": 11, "errors": 0, "risk": "Green"}
}

MONTH_MAP = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
}

def get_ist_dates():
    """Returns today's date formatted in raw (YYYY-MM-DD) and slash (DD/MM/YYYY) for database matching."""
    ist = pytz.timezone('Asia/Kolkata')
    now = datetime.now(ist)
    raw_date = now.strftime('%Y-%m-%d')
    slash_date = now.strftime('%d/%m/%Y')
    return raw_date, slash_date

@router.get("/summary")
async def get_summary(
    period: str = Query("today", description="Choose 'today' or 'overall'"),
    month: str = Query(None, description="Filter by a specific month name (e.g., 'August') or number (e.g., '08')")
):
    """
    Returns yield details:
    alert count, success count, error count, and department breakdown sorted by risk level.
    Supports dynamic month filtering for specific historical summaries.
    """
    from main import db
    
    today_raw, today_slash = get_ist_dates()
    
    # Parse target month if requested
    target_month_num = None
    if month:
        month_clean = month.strip().lower()
        if month_clean in MONTH_MAP:
            target_month_num = MONTH_MAP[month_clean]
        else:
            try:
                target_month_num = int(month_clean)
            except ValueError:
                pass

    db_hods = {}
    db_supervisors = {}
    db_today_metrics = {dept: {"alerts": 0, "success": 0, "errors": 0} for dept in DEPT_CONFIG}
    db_overall_metrics = {dept: {"alerts": 0, "success": 0, "errors": 0} for dept in DEPT_CONFIG}
    db_active = False

    if db is not None:
        try:
            db_active = True
            # 1. Query HOD and Supervisor Users
            cursor = db["users"].find({"role": {"$in": ["hod", "supervisor"]}})
            users = await cursor.to_list(length=300)
            
            for user in users:
                role = user.get("role")
                depts_str = user.get("department", "NONE")
                if depts_str and depts_str != "NONE":
                    depts = [d.strip().lower() for d in depts_str.split(",") if d.strip()]
                    for dept in depts:
                        if dept in DEPT_CONFIG:
                            if role == "hod":
                                db_hods[dept] = {
                                    "name": user.get("name", "HOD User"),
                                    "email": user.get("gmail") or user.get("email") or "hod@arcolab.com"
                                }
                            elif role == "supervisor":
                                if dept not in db_supervisors:
                                    db_supervisors[dept] = []
                                db_supervisors[dept].append({
                                    "name": user.get("name", "Supervisor User"),
                                    "email": user.get("gmail") or user.get("email") or "supervisor@arcolab.com",
                                    "employeeId": user.get("employeeId", "EMP-SUB"),
                                    "shift": user.get("shift", "1")
                                })
            
            # 2. Query Metrics (Q, D, S, I)
            metrics_cursor = db["metrics"].find({})
            metrics_list = await metrics_cursor.to_list(length=500)
            
            for m in metrics_list:
                dept = m.get("dept", "unknown")
                if dept not in DEPT_CONFIG:
                    continue
                
                letter = m.get("letter", "")
                shifts = m.get("shifts", {})
                
                for shift_key, shift_data in shifts.items():
                    logs = shift_data.get("issueLogs", [])
                    for l in logs:
                        raw_date = l.get("rawDate", "")
                        slash_date = l.get("date", "")
                        
                        # Extract month of log
                        log_month = None
                        if raw_date and len(raw_date.split("-")) == 3:
                            try:
                                log_month = int(raw_date.split("-")[1])
                            except:
                                pass
                        elif slash_date and len(slash_date.split("/")) == 3:
                            try:
                                log_month = int(slash_date.split("/")[1])
                            except:
                                pass
                        
                        # Apply month filter if requested
                        if target_month_num is not None and log_month != target_month_num:
                            continue

                        is_today = (raw_date == today_raw or slash_date == today_slash)
                        
                        is_success = False
                        is_alert = False
                        is_error = False
                        
                        # KPI Evaluation Logic matching standard rules
                        if letter == "Q":
                            if l.get("reason") == "Target Met":
                                is_success = True
                            else:
                                is_alert = True
                        elif letter == "S":
                            if int(l.get("numSafetyIncidents", 0)) == 0:
                                is_success = True
                            else:
                                is_alert = True
                        elif letter == "D":
                            planned = int(l.get("planned", 0))
                            dispatched = int(l.get("dispatched", 0))
                            breakdowns = int(l.get("breakdowns", 0))
                            efficiency = (dispatched / planned * 100) if planned > 0 else 0
                            if efficiency >= 90 and breakdowns == 0:
                                is_success = True
                            else:
                                is_alert = True
                                if breakdowns > 0:
                                    is_error = True
                        else:
                            if int(l.get("breakdowns", 0)) > 0 or l.get("incident"):
                                is_alert = True
                                is_error = True
                            else:
                                is_success = True
                        
                        # Increment overall
                        if is_success:
                            db_overall_metrics[dept]["success"] += 1
                        if is_alert:
                            db_overall_metrics[dept]["alerts"] += 1
                        if is_error:
                            db_overall_metrics[dept]["errors"] += 1
                            
                        # Increment today
                        if is_today:
                            if is_success:
                                db_today_metrics[dept]["success"] += 1
                            if is_alert:
                                db_today_metrics[dept]["alerts"] += 1
                            if is_error:
                                db_today_metrics[dept]["errors"] += 1
            
            # 3. Query Health Meetings (H)
            health_cursor = db["healths"].find({})
            health_list = await health_cursor.to_list(length=500)
            
            ist = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.now(ist)
            
            for doc in health_list:
                dept = doc.get("dept", "unknown")
                if dept not in DEPT_CONFIG:
                    continue
                
                doc_year = doc.get("year")
                doc_month = doc.get("month", "")
                doc_month_num = MONTH_MAP.get(doc_month.lower(), 0)
                
                # Apply month filter if requested
                if target_month_num is not None and doc_month_num != target_month_num:
                    continue

                days = doc.get("days", [])
                for day in days:
                    status = str(day.get("status", ""))
                    is_success = (status == "meeting")
                    is_alert = (status == "no-meeting")
                    
                    is_today = (
                        doc_year == now_ist.year and 
                        doc_month_num == now_ist.month and 
                        int(day.get("date", 0)) == now_ist.day
                    )
                    
                    if is_success:
                        db_overall_metrics[dept]["success"] += 1
                        if is_today:
                            db_today_metrics[dept]["success"] += 1
                    elif is_alert:
                        db_overall_metrics[dept]["alerts"] += 1
                        if is_today:
                            db_today_metrics[dept]["alerts"] += 1
                            
        except Exception as e:
            logger.error(f"Error compiling database analytics: {e}")
            db_active = False

    # Check if today has data
    today_total = sum(d["alerts"] + d["success"] for d in db_today_metrics.values())
    overall_total = sum(d["alerts"] + d["success"] for d in db_overall_metrics.values())
    
    # Selection of period and fallbacks
    selected_period = period.lower()
    
    # If today was requested but has no logs, and the database has overall historical logs, fallback to overall
    if selected_period == "today" and today_total == 0 and overall_total > 0:
        selected_period = "overall"
        logger.info("Today's data is empty, falling back to overall database totals.")

    use_db = db_active and (
        (selected_period == "today" and today_total > 0) or 
        (selected_period == "overall" and overall_total > 0)
    )

    departments_summary = []
    total_alerts = 0
    total_success = 0
    total_errors = 0

    for dept_key, dept_name in DEPT_CONFIG.items():
        hod_info = db_hods.get(dept_key) or FALLBACK_HODS.get(dept_key)
        supervisors = db_supervisors.get(dept_key) or FALLBACK_SUPERVISORS.get(dept_key, [])
        
        if use_db:
            if selected_period == "today":
                metrics_data = db_today_metrics.get(dept_key)
            else:
                metrics_data = db_overall_metrics.get(dept_key)
                
            alerts = metrics_data["alerts"]
            success = metrics_data["success"]
            errors = metrics_data["errors"]
        else:
            # Standalone Sandbox Fallback
            mock_data = FALLBACK_METRICS.get(dept_key, {"alerts": 0, "success": 5, "errors": 0})
            alerts = mock_data["alerts"]
            success = mock_data["success"]
            errors = mock_data["errors"]

        # Risk Classification Engine
        if alerts >= 3:
            risk = "Red"
        elif alerts == 2:
            risk = "Orange"
        elif alerts == 1:
            risk = "Amber"
        else:
            risk = "Green"
            
        total_alerts += alerts
        total_success += success
        total_errors += errors
        
        departments_summary.append({
            "key": dept_key,
            "name": dept_name,
            "risk_level": risk,
            "alert_count": alerts,
            "success_count": success,
            "error_count": errors,
            "hod_name": hod_info["name"],
            "hod_email": hod_info["email"],
            "supervisors": supervisors
        })

    # Sort priorities: Red -> Orange -> Amber -> Green
    risk_priority = {"Red": 0, "Orange": 1, "Amber": 2, "Green": 3}
    departments_summary.sort(key=lambda d: (risk_priority.get(d["risk_level"], 4), -d["alert_count"]))

    # Label data source and period context
    data_source_label = "MongoDB Active" if use_db else "Mock/Telemetry Hybrid Sandbox"
    
    if target_month_num is not None:
        month_name_label = next((k.capitalize() for k, v in MONTH_MAP.items() if v == target_month_num), f"Month {target_month_num}")
        period_label = f"Overall ({month_name_label})"
    else:
        period_label = "Overall (12m)" if selected_period == "overall" else "Today"

    return {
        "date": today_raw,
        "date_formatted": period_label,
        "period": period_label,
        "alert_count": total_alerts,
        "success_count": total_success,
        "error_count": total_errors,
        "departments": departments_summary,
        "data_source": f"{data_source_label} ({period_label})"
    }
