from typing import Optional, Any, Union
from coding_router import router as coding_router
from admin_router import router as admin_router
from report import (
    insert_interview_report,
    get_user_reports,
    get_latest_report,
    save_interview_answer_db,
    get_interview_history_all,
)
import json
import re
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr,  Field
from interview import (
    extract_resume_information,
    generate_first_question,
    analyze_answer,
    generate_next_question,
    generate_feedback_report
)
from auth import signup_user, login_user
from database import get_connection, init_db
from pypdf import PdfReader
from io import BytesIO
from auth_google import google_login_user


app = FastAPI(
    title="AI Interview Preparation API",
    version="1.0.0"
)


@app.on_event("startup")
def on_startup():
    init_db()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/signup")
def signup(request: SignupRequest):

    try:

        name = request.name.strip()
        email = str(request.email).lower().strip()
        password = request.password

        if not name:
            raise HTTPException(
                status_code=400,
                detail="Name is required"
            )

        if not password:
            raise HTTPException(
                status_code=400,
                detail="Password is required"
            )

        if len(password) < 6:
            raise HTTPException(
                status_code=400,
                detail="Password must contain at least 6 characters"
            )

        result = signup_user(
            name,
            email,
            password
        )

        if not result.get("success"):

            raise HTTPException(
                status_code=400,
                detail=result.get(
                    "message",
                    "Signup failed"
                )
            )

        return result

    except HTTPException:
        raise

    except Exception as e:

        print(
            "SIGNUP ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create account"
        )


@app.post("/auth/login")
def login(request: LoginRequest):

    try:

        email = str(request.email).lower().strip()

        result = login_user(
            email,
            request.password
        )

        if not result.get("success"):

            raise HTTPException(
                status_code=401,
                detail=result.get(
                    "message",
                    "Invalid email or password"
                )
            )

        return result

    except HTTPException:
        raise

    except Exception as e:

        print(
            "LOGIN ERROR:",
            repr(e)
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to login"
        )


MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB

@app.post("/resume/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: Optional[int] = Query(None)
):
    try:
        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No file selected"
            )
        filename = file.filename.lower()
        if not filename.endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported"
            )
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty"
            )
        if len(file_bytes) > MAX_PDF_SIZE:

            raise HTTPException(
                status_code=413,
                detail="PDF file is too large. Maximum size is 10 MB."
            )
        reader = PdfReader(
            BytesIO(file_bytes)
        )
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(
                    page_text.strip()
                )
        resume_text = "\n".join(text_parts)
        if not resume_text.strip():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Could not extract text from PDF. "
                    "Please upload a text-based PDF."
                )
            )
        resume_data = extract_resume_information(
            resume_text
        )

        def check_coding_skills_eligibility(rdata: dict, rtext: str = "") -> dict:
            allowed = ["Python", "Java", "JavaScript", "C++", "C"]
            skills_list = []
            if isinstance(rdata, dict):
                for k in ["skills", "programming_languages", "technologies"]:
                    val = rdata.get(k, [])
                    if isinstance(val, list):
                        skills_list.extend([str(item).lower().strip() for item in val])
                    elif isinstance(val, str):
                        skills_list.append(val.lower().strip())
            
            combined_skills_text = " ".join(skills_list) + " " + (rtext or "").lower()
            detected = []
            if re.search(r"\bpython\b", combined_skills_text):
                detected.append("Python")
            clean_no_js = re.sub(r"\bjavascript\b|\bjs\b", "", combined_skills_text)
            if re.search(r"\bjava\b", clean_no_js):
                detected.append("Java")
            if re.search(r"\bjavascript\b|\bjs\b|\becmascript\b|\bnode(?:\.js)?\b", combined_skills_text):
                detected.append("JavaScript")
            if re.search(r"\bc\+\+|\bcpp\b", combined_skills_text):
                detected.append("C++")
            if re.search(r"\bc\s*programming|\blanguage\s*c\b|\bc\s*language\b|\bansi\s*c\b", combined_skills_text) or any(s.strip() == "c" for s in skills_list):
                detected.append("C")

            is_eligible = len(detected) > 0
            return {
                "is_eligible": is_eligible,
                "eligible_languages": sorted(list(set(detected))),
                "message": (
                    f"Eligible for coding interview with: {', '.join(sorted(list(set(detected))))}"
                    if is_eligible
                    else "You are not skilled in Python, Java, JavaScript, C++, or C programming. You cannot attend the coding interview."
                )
            }

        coding_eligibility = check_coding_skills_eligibility(resume_data, resume_text)

        # Auto-save resume to MySQL user_resumes table for admin oversight
        try:
            conn = get_connection()
            cur = conn.cursor()
            skills_list = coding_eligibility.get("eligible_languages", [])
            if isinstance(resume_data, dict) and isinstance(resume_data.get("skills"), list):
                skills_list.extend(resume_data.get("skills"))
            skills_str = ", ".join(list(dict.fromkeys([str(s) for s in skills_list])))
            exp_lvl = "Junior"
            if isinstance(resume_data, dict):
                exp_lvl = resume_data.get("experience_level") or "Junior"
            actual_user_id = 1
            if user_id and user_id > 0:
                cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                user_found = cur.fetchone()
                if user_found:
                    actual_user_id = user_id

            cur.execute(
                """
                INSERT INTO user_resumes (user_id, filename, raw_text, resume_json, skills_detected, experience_level)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    actual_user_id,
                    file.filename,
                    resume_text,
                    json.dumps(resume_data),
                    skills_str,
                    str(exp_lvl),
                )
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as r_err:
            print("[WARN] Could not save resume to user_resumes table:", r_err)

        return {
            "success": True,
            "filename": file.filename,
            "resume_data": resume_data,
            "coding_eligibility": coding_eligibility
        }
    except HTTPException:
        raise
    except Exception as e:
        print(
            "RESUME UPLOAD ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to process resume"
        )
    finally:
        await file.close()

class FirstQuestionRequest(BaseModel):
    resume_data: dict
    difficulty: str = Field(
        default="Easy",
        min_length=3,
        max_length=20
    )

@app.post("/interview/first-question")
def first_question(
    request: FirstQuestionRequest
):
    try:
        question = generate_first_question(
            request.resume_data,
            request.difficulty
        )
        return {
            "success": True,
            "question": question
        }
    except Exception as e:
        print(
            "FIRST QUESTION ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate first question"
        )

class AnswerRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1
    )
    candidate_answer: str = Field(
        ...,
        min_length=1
    )
    current_difficulty: str = Field(
        default="Easy",
        min_length=3,
        max_length=20
    )
    user_id: Optional[Any] = 1
    question_number: Optional[int] = 1

@app.post("/interview/answer")
def evaluate_answer(
    request: AnswerRequest
):
    try:
        evaluation = analyze_answer(
            request.question,
            request.candidate_answer,
            request.current_difficulty
        )

        # Persist technical interview question and candidate answer into MySQL with correct_answer
        correct_answer = evaluation.get("correct_answer") or ""
        save_interview_answer_db(
            user_id=request.user_id,
            question_number=request.question_number,
            question=request.question,
            answer=request.candidate_answer,
            difficulty=request.current_difficulty,
            evaluation=evaluation,
            correct_answer=correct_answer
        )

        return {
            "success": True,
            "evaluation": evaluation,
            "correct_answer": correct_answer
        }
    except Exception as e:
        print(
            "ANSWER ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to evaluate answer"
        )

class NextQuestionRequest(BaseModel):
    resume_data: dict
    chat_history: list = Field(
        default_factory=list
    )
    current_difficulty: str = Field(
        default="Easy",
        min_length=3,
        max_length=20
    )
    evaluation: dict = Field(
        default_factory=dict
    )
    asked_sections: list = Field(
        default_factory=list
    )

@app.post("/interview/next-question")
def next_question(
    request: NextQuestionRequest
):
    try:
        question = generate_next_question(
            request.resume_data,
            request.chat_history,
            request.current_difficulty,
            request.evaluation,
            request.asked_sections
        )
        return {
            "success": True,
            "question": question
        }
    except Exception as e:
        print(
            "NEXT QUESTION ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate next question"
        )

class ReportRequest(BaseModel):
    resume_data: dict
    interview_history: list = Field(
        default_factory=list
    )

@app.post("/interview/report")
def interview_report(
    request: ReportRequest
):
    try:
        report = generate_feedback_report(
            request.resume_data,
            request.interview_history
        )
        return {
            "success": True,
            "report": report
        }
    except Exception as e:
        print(
            "REPORT ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to generate interview report"
        )

class SaveReportRequest(BaseModel):
    user_id: int = Field(
        ...,
        gt=0
    )
    report: dict

@app.post("/reports/save")
def save_report(
    request: SaveReportRequest
):
    try:
        report_id = insert_interview_report(
            user_id=request.user_id,
            report=request.report
        )
        return {
            "success": True,
            "message": "Interview report saved successfully",
            "report_id": report_id
        }
    except Exception as e:
        print(
            "SAVE REPORT ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to save interview report"
        )

@app.get("/reports/{user_id}")
def get_reports(
    user_id: int
):
    if user_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID"
        )
    try:
        reports = get_user_reports(
            user_id
        )
        return {
            "success": True,
            "reports": reports
        }
    except Exception as e:
        print(
            "GET REPORTS ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch reports"
        )

@app.get("/home-dashboard/{user_id}")
def get_home_dashboard(
    user_id: int
):
    if user_id <= 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid user ID"
        )
    connection = None
    cursor = None
    try:
        connection = get_connection()
        cursor = connection.cursor(
            dictionary=True
        )
        cursor.execute(
            """
            SELECT
                id,
                user_id,
                overall_score,
                technical_score,
                skills_score,
                projects_score,
                experience_score,
                final_level,
                created_at
            FROM interview_reports
            WHERE user_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,)
        )
        report = cursor.fetchone()
        from coding_router import user_coding_reports
        coding_rep = user_coding_reports.get(str(user_id))

        return {
            "success": True,
            "has_previous_report": bool(report),
            "report": report,
            "has_previous_coding_report": bool(coding_rep),
            "coding_report": coding_rep
        }
    except Exception as e:
        print(
            "DASHBOARD DATABASE ERROR:",
            repr(e)
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to load dashboard"
        )
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()


class GoogleAuthRequest(BaseModel):
    credential: str


@app.post("/auth/google")
def google_auth(data: GoogleAuthRequest):
    try:
        return google_login_user(data.credential)

    except Exception as e:
        print("Google authentication error:", e)

        raise HTTPException(
            status_code=401,
            detail=str(e)
        )


app.include_router(coding_router)
app.include_router(admin_router)


@app.get("/history/{user_id}")
@app.get("/interview/history/{user_id}")
def get_user_interview_history(user_id: int):
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    try:
        data = get_interview_history_all(user_id)
        return {
            "success": True,
            **data
        }
    except Exception as e:
        print("GET INTERVIEW HISTORY ERROR:", repr(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve interview history"
        )


class CheckEligibilityRequest(BaseModel):
    resume_data: Optional[dict] = None
    resume_text: Optional[str] = ""


@app.post("/resume/check-eligibility")
def check_resume_skills_eligibility(request: CheckEligibilityRequest):
    rdata = request.resume_data or {}
    rtext = request.resume_text or ""
    allowed = ["Python", "Java", "JavaScript", "C++", "C"]
    skills_list = []
    if isinstance(rdata, dict):
        for k in ["skills", "programming_languages", "technologies"]:
            val = rdata.get(k, [])
            if isinstance(val, list):
                skills_list.extend([str(item).lower().strip() for item in val])
            elif isinstance(val, str):
                skills_list.append(val.lower().strip())
    
    combined_skills_text = " ".join(skills_list) + " " + rtext.lower()
    detected = []
    if re.search(r"\bpython\b", combined_skills_text):
        detected.append("Python")
    clean_no_js = re.sub(r"\bjavascript\b|\bjs\b", "", combined_skills_text)
    if re.search(r"\bjava\b", clean_no_js):
        detected.append("Java")
    if re.search(r"\bjavascript\b|\bjs\b|\becmascript\b|\bnode(?:\.js)?\b", combined_skills_text):
        detected.append("JavaScript")
    if re.search(r"\bc\+\+|\bcpp\b", combined_skills_text):
        detected.append("C++")
    if re.search(r"\bc\s*programming|\blanguage\s*c\b|\bc\s*language\b|\bansi\s*c\b", combined_skills_text) or any(s.strip() == "c" for s in skills_list):
        detected.append("C")

    is_eligible = len(detected) > 0
    return {
        "success": True,
        "is_eligible": is_eligible,
        "eligible_languages": sorted(list(set(detected))),
        "message": (
            f"Eligible for coding interview with: {', '.join(sorted(list(set(detected))))}"
            if is_eligible
            else "You are not skilled in Python, Java, JavaScript, C++, or C programming. You cannot attend the coding interview."
        )
    }




