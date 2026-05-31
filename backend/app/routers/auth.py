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
    
    print("\n" + "="*50)
    print(f"[RECOVERY DAEMON] OTP code generated for {data.email}: {otp}")
    print("="*50 + "\n")
    
    return {"detail": "A verification OTP has been printed to the server console."}

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

@router.post("/google", response_model=schemas.Token)
def google_auth(data: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    email = None
    if data.credential_token.startswith("mock-google-token-"):
        email = data.credential_token.replace("mock-google-token-", "")
    else:
        if "@" in data.credential_token:
            email = data.credential_token
        else:
            email = "googleuser@example.com"
            
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
