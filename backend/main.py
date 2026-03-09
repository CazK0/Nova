from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
import mss
import mss.tools
import google.generativeai as genai
import base64
import os
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class StatusResponse(BaseModel):
    status: str
    message: str

class Region(BaseModel):
    x: int
    y: int
    width: int
    height: int

class AnalyzeRequest(BaseModel):
    image_b64: str

@app.get("/health", response_model=StatusResponse)
def health():
    return StatusResponse(status="ok", message="Backend running")

@app.post("/screenshot")
def screenshot(region: Region):
    with mss.mss() as sct:
        monitor = {"top": region.y, "left": region.x, "width": region.width, "height": region.height}
        shot = sct.grab(monitor)
        png = mss.tools.to_png(shot.rgb, shot.size)
    return Response(content=png, media_type="image/png")

@app.get("/screenshot/fullscreen")
def fullscreen():
    with mss.mss() as sct:
        monitor = sct.monitors[1]
        shot = sct.grab(monitor)
        png = mss.tools.to_png(shot.rgb, shot.size)
    return Response(content=png, media_type="image/png")

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    image_bytes = base64.b64decode(req.image_b64)
    prompt = (
        "You are an expert software engineer helping solve a coding problem. "
        "Analyze the problem shown in this screenshot. "
        "Provide: 1) A brief explanation of the approach, 2) A clean working solution with code. "
        "Be concise and direct."
    )
    image_part = {"mime_type": "image/png", "data": image_bytes}

    def stream():
        for chunk in model.generate_content([prompt, image_part], stream=True):
            if chunk.text:
                yield chunk.text

    return StreamingResponse(stream(), media_type="text/plain")
