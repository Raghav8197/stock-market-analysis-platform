from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas, auth

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not auth.verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(
        data={"sub": user.email, "id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login-form", response_model=schemas.Token)
def login_user_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password flow login (for Swagger UI testing)."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = auth.create_access_token(
        data={"sub": user.email, "id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

# In-memory store for OTP codes
RESET_OTP_DB = {}

def send_otp_email(to_email: str, otp: str):
    import smtplib
    from email.mime.text import MIMEText
    from email.header import Header
    from app.config import settings

    subject = "Antigravity Market IQ - Password Recovery OTP"
    body = f"""Hello,

You have requested a password reset for your Antigravity Market IQ account.

Your 6-digit verification code (OTP) is:
{otp}

This code is valid for 15 minutes. If you did not request this, please ignore this email.

Best regards,
The Antigravity Team
"""
    
    # Check if SMTP is configured
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print("\n" + "="*50)
        print("[WARNING] SMTP is not fully configured. Email could not be sent.")
        print(f"[RECOVERY DAEMON] OTP code for {to_email}: {otp}")
        print("Please configure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in your environment to send real emails.")
        print("="*50 + "\n")
        return False, "SMTP settings are not configured"

    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = Header(subject, 'utf-8')
        msg['From'] = settings.SMTP_FROM or settings.SMTP_USER
        msg['To'] = to_email

        # Custom SMTP subclass that forces IPv4 connections to prevent "Network is unreachable" errors
        class SMTP_IPv4(smtplib.SMTP):
            def _get_socket(self, host, port, timeout):
                import socket
                err = None
                for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
                    af, socktype, proto, canonname, sa = res
                    sock = None
                    try:
                        sock = socket.socket(af, socktype, proto)
                        if timeout is not None:
                            sock.settimeout(timeout)
                        sock.connect(sa)
                        return sock
                    except socket.error as e:
                        err = e
                        if sock is not None:
                            sock.close()
                if err is not None:
                    raise err
                else:
                    raise socket.error("getaddrinfo returns an empty list")

        # Connect to SMTP forcing IPv4
        server = SMTP_IPv4(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        if settings.SMTP_TLS:
            server.starttls()
        # Clean up any potential copy-paste whitespace/spaces from email and App Password
        smtp_user = settings.SMTP_USER.strip() if settings.SMTP_USER else ""
        smtp_password = settings.SMTP_PASSWORD.replace(" ", "") if settings.SMTP_PASSWORD else ""
        server.login(smtp_user, smtp_password)
        server.sendmail(msg['From'], [to_email], msg.as_string())
        server.quit()
        print(f"[RECOVERY DAEMON] Real OTP email successfully sent to {to_email}")
        return True, "Success"
    except Exception as e:
        err_msg = str(e)
        print(f"[RECOVERY DAEMON] Error sending OTP email to {to_email}: {err_msg}")
        # Print fallback to console so the app doesn't break in dev if SMTP fails
        print(f"[FALLBACK LOG] OTP code for {to_email}: {otp}")
        return False, err_msg

@router.post("/forgot-password")
def forgot_password(data: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user registered with this email address."
        )
        
    import random
    otp = f"{random.randint(100000, 999999)}"
    RESET_OTP_DB[data.email.lower()] = otp
    
    email_sent, message = send_otp_email(data.email, otp)
    
    if email_sent:
        return {"detail": "A verification OTP has been sent to your email address."}
    else:
        # If it failed because SMTP settings are completely missing from config, return local fallback message
        if "not configured" in message:
            return {"detail": "A verification OTP was generated (check console output in development)."}
        else:
            # If there was an actual error trying to connect/send (such as bad password or network block), raise it!
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to send email: {message}"
            )

@router.post("/verify-otp")
def verify_otp(data: schemas.VerifyOTPRequest):
    email = data.email.lower()
    stored_otp = RESET_OTP_DB.get(email)
    
    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP code."
        )
        
    return {"detail": "OTP verified successfully. You may now reset your password."}

@router.post("/reset-password")
def reset_password(data: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = data.email.lower()
    stored_otp = RESET_OTP_DB.get(email)
    
    if not stored_otp or stored_otp != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP verification."
        )
        
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
        
    user.hashed_password = auth.get_password_hash(data.new_password)
    db.commit()
    
    del RESET_OTP_DB[email]
    
    print(f"[RECOVERY DAEMON] Password successfully updated for {data.email}")
    return {"detail": "Password has been reset successfully. Please log in with your new credentials."}

def verify_google_id_token(token: str) -> dict:
    """Verifies the Google ID token and returns the user info payload."""
    import urllib.request
    import json
    from jose import jwt
    from app.config import settings

    try:
        # Fetch Google's public JWK certificates
        with urllib.request.urlopen("https://www.googleapis.com/oauth2/v3/certs", timeout=5) as response:
            jwks = json.loads(response.read().decode())
            
        # Get unverified header to match kid
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        public_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                public_key = key
                break
                
        if not public_key:
            print(f"[OAuth] No public key found matching kid: {kid}")
            return None
            
        # Validate audience only if GOOGLE_CLIENT_ID is configured in settings
        if settings.GOOGLE_CLIENT_ID:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=settings.GOOGLE_CLIENT_ID,
                issuer="https://accounts.google.com"
            )
        else:
            print("[WARNING] GOOGLE_CLIENT_ID is not set in settings. Audience validation disabled.")
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                options={"verify_aud": False},
                issuer="https://accounts.google.com"
            )
        return payload
    except Exception as e:
        print(f"[OAuth] Google token verification failed: {e}")
        return None

@router.post("/google", response_model=schemas.Token)
def google_auth(data: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    # Verify the real Google ID Token
    payload = verify_google_id_token(data.credential_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired Google authentication credentials."
        )
        
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address not provided in Google profile."
        )
        
    email = email.strip().lower()
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        import uuid
        random_password = str(uuid.uuid4())
        hashed_password = auth.get_password_hash(random_password)
        user = models.User(
            email=email,
            hashed_password=hashed_password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[OAuth] Automatically registered new Google user: {email}")
    else:
        print(f"[OAuth] Logged in existing Google user: {email}")
        
    access_token = auth.create_access_token(
        data={"sub": user.email, "id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Force reload for new env settings
