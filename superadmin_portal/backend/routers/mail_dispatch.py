import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger("superadmin_portal.mail_dispatch")
router = APIRouter()

class MailPayload(BaseModel):
    recipient_email: str
    subject: str
    body: str

@router.post("/send-mail")
async def send_mail(payload: MailPayload):
    """
    Sends an email directly and silently using the configured SMTP server.
    Does not trigger client-side redirects or external application opens.
    """
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port_str = os.getenv("SMTP_PORT", "587")
    smtp_secure_str = os.getenv("SMTP_SECURE", "false")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    # Check if SMTP parameters exist
    if not smtp_user or not smtp_pass:
        logger.error("SMTP credentials (SMTP_USER/SMTP_PASS) are not loaded.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Mail credentials are not configured in the application environment."
        )
        
    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587
        
    smtp_secure = smtp_secure_str.lower() == "true"
    
    # Construct MIMEMultipart email object
    msg = MIMEMultipart("alternative")
    msg["Subject"] = payload.subject
    msg["From"] = f"PivotPath Superadmin <{smtp_user}>"
    msg["To"] = payload.recipient_email
    
    # Format body as HTML (since it can contain tags from the RichTextEmailModal editor)
    html_part = MIMEText(payload.body, "html")
    msg.attach(html_part)
    
    # Connect and send
    try:
        if smtp_secure:
            logger.info(f"Connecting to SMTP SSL: {smtp_host}:{smtp_port}")
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
        else:
            logger.info(f"Connecting to SMTP STARTTLS: {smtp_host}:{smtp_port}")
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.starttls()
            
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, payload.recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"✅ In-App email successfully dispatched to HOD: {payload.recipient_email}")
        return {
            "status": "success",
            "message": f"Email successfully dispatched to {payload.recipient_email}",
            "recipient": payload.recipient_email
        }
    except Exception as e:
        logger.error(f"❌ SMTP dispatch error: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Mail pipeline failed: {str(e)}"
        )
