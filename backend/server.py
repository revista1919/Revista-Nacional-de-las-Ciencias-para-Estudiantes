from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from typing import List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
import os
from dotenv import load_dotenv
import uuid
import cloudinary
import cloudinary.uploader
import string
import random
import logging
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

app = FastAPI(title="La Revista Nacional de las Ciencias para Estudiantes")
api_router = APIRouter(prefix="/api")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
import ssl
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
client = AsyncIOMotorClient(mongo_url, ssl_context=ssl_context)
db = client[os.environ['DB_NAME']]

# JWT configuration
SECRET_KEY = os.getenv("SECRET_KEY", "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Gmail SMTP configuration
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "revistaestudiantespentauc@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    institution: str
    study_area: str
    role: str = "visitor"
    contributions: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Paper(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    authors: List[str]
    institution: str
    email: EmailStr
    category: str
    abstract: str
    keywords: List[str]
    word_count: int
    file_url: str
    status: str = "pending"
    submission_date: datetime = Field(default_factory=datetime.utcnow)
    comments: List[str] = []
    doi: str = Field(default_factory=lambda: f"RNCE-{uuid.uuid4()}")

class AdminApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    institution: str
    cv_url: str
    motivation_letter: str
    specialization: List[str]
    references: List[str]
    experience: str
    certificates_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(email: str):
    user = await db.users.find_one({"email": email})
    return user

async def authenticate_user(email: str, password: str):
    user = await get_user(email)
    if not user or not verify_password(password, user.get("password", "")):
        return False
    return user

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await get_user(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Email sending function
def send_email(to_email: str, subject: str, body: str, attachment: Optional[bytes] = None, filename: Optional[str] = None):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        if attachment and filename:
            part = MIMEApplication(attachment, Name=filename)
            part['Content-Disposition'] = f'attachment; filename="{filename}"'
            msg.attach(part)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        logging.error(f"Error sending email: {e}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "La Revista Nacional de las Ciencias para Estudiantes API"}

@api_router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/register")
async def register(
    email: EmailStr = Form(...),
    password: str = Form(...),
    name: str = Form(...),
    institution: str = Form(...),
    study_area: str = Form(...)
):
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(password)
    user_data = User(
        email=email,
        name=name,
        institution=institution,
        study_area=study_area
    ).dict()
    
    user_data["password"] = hashed_password
    
    # Set super admin
    if email == "revistaestudiantespentauc@gmail.com":
        user_data["role"] = "super_admin"
    
    await db.users.insert_one(user_data)
    return {"message": "User registered successfully"}

@api_router.post("/submit-paper")
async def submit_paper(
    title: str = Form(...),
    authors: str = Form(...),
    institution: str = Form(...),
    email: EmailStr = Form(...),
    category: str = Form(...),
    abstract: str = Form(...),
    keywords: str = Form(...),
    word_count: int = Form(...),
    file: UploadFile = File(...)
):
    # Validation
    if word_count < 2000 or word_count > 8000:
        raise HTTPException(status_code=400, detail="Word count must be between 2000 and 8000")
    
    if not file.filename.lower().endswith((".doc", ".docx")):
        raise HTTPException(status_code=400, detail="Only .doc or .docx files allowed")

    # Upload file to Cloudinary
    file_content = await file.read()
    upload_result = cloudinary.uploader.upload(
        file_content, 
        resource_type="raw",
        folder="revista_papers"
    )
    file_url = upload_result["secure_url"]

    # Create paper
    paper_data = Paper(
        title=title,
        authors=authors.split(","),
        institution=institution,
        email=email,
        category=category,
        abstract=abstract,
        keywords=keywords.split(","),
        word_count=word_count,
        file_url=file_url
    ).dict()

    await db.papers.insert_one(paper_data)
    
    # Send notification email
    send_email(
        SMTP_EMAIL,
        "New Paper Submission",
        f"Title: {title}\nAuthors: {authors}\nInstitution: {institution}\nCategory: {category}\nAbstract: {abstract}\nDOI: {paper_data['doi']}",
        file_content,
        file.filename
    )
    
    return {"message": "Paper submitted successfully", "doi": paper_data['doi']}

@api_router.post("/apply-admin")
async def apply_admin(
    name: str = Form(...),
    email: EmailStr = Form(...),
    institution: str = Form(...),
    cv: UploadFile = File(...),
    motivation_letter: str = Form(...),
    specialization: str = Form(...),
    references: str = Form(...),
    experience: str = Form(...),
    certificates: UploadFile = File(...)
):
    if len(motivation_letter) < 500:
        raise HTTPException(status_code=400, detail="Motivation letter must be at least 500 words")

    # Upload files to Cloudinary
    cv_content = await cv.read()
    certificates_content = await certificates.read()
    
    cv_upload = cloudinary.uploader.upload(cv_content, resource_type="raw", folder="revista_cvs")
    cert_upload = cloudinary.uploader.upload(certificates_content, resource_type="raw", folder="revista_certificates")

    application_data = AdminApplication(
        name=name,
        email=email,
        institution=institution,
        cv_url=cv_upload["secure_url"],
        motivation_letter=motivation_letter,
        specialization=specialization.split(","),
        references=references.split(","),
        experience=experience,
        certificates_url=cert_upload["secure_url"]
    ).dict()

    await db.admin_applications.insert_one(application_data)
    
    # Send notification email
    send_email(
        SMTP_EMAIL,
        "New Admin Application",
        f"Name: {name}\nEmail: {email}\nInstitution: {institution}\nMotivation: {motivation_letter}",
        cv_content,
        cv.filename
    )
    
    return {"message": "Admin application submitted successfully"}

@api_router.get("/papers")
async def get_papers(
    category: Optional[str] = None, 
    author: Optional[str] = None, 
    institution: Optional[str] = None,
    status: Optional[str] = None
):
    query = {}
    
    if status:
        query["status"] = status
    else:
        query["status"] = "approved"  # Only show approved papers by default
    
    if category:
        query["category"] = category
    if author:
        query["authors"] = {"$in": [author]}
    if institution:
        query["institution"] = institution

    papers = await db.papers.find(query).to_list(length=100)
    return papers

@api_router.get("/admin/applications")
async def get_admin_applications(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    applications = await db.admin_applications.find().to_list(length=100)
    return applications

@api_router.post("/review/{paper_id}")
async def review_paper(
    paper_id: str, 
    action: str = Form(...), 
    comment: str = Form(...), 
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    paper = await db.papers.find_one({"id": paper_id})
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Update paper status
    updated_comments = paper.get("comments", []) + [comment]
    await db.papers.update_one(
        {"id": paper_id}, 
        {
            "$set": {
                "status": action, 
                "comments": updated_comments,
                "reviewed_at": datetime.utcnow()
            }
        }
    )
    
    # Send notification email to author
    send_email(
        paper["email"],
        f"Paper {action.capitalize()}",
        f"Your paper '{paper['title']}' has been {action}.\n\nComment: {comment}"
    )
    
    return {"message": f"Paper {action} successfully"}

@api_router.get("/current_user")
async def get_current_user_endpoint(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.get("/categories")
async def get_categories():
    return [
        'Matemáticas', 'Física', 'Química', 'Biología', 'Medicina', 'Psicología',
        'Sociología', 'Historia', 'Economía', 'Ingeniería', 'Informática', 'Astronomía',
        'Geología', 'Antropología', 'Filosofía'
    ]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()