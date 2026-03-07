from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import mss
import mss.tools

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
