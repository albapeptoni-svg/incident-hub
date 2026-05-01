from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
import tempfile
import os
import traceback

app = FastAPI(title="OCR Backend SIEC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

easyocr_reader = None

def get_easyocr_reader():
    global easyocr_reader
    if easyocr_reader is None:
        import easyocr
        easyocr_reader = easyocr.Reader(["es", "en"], gpu=False)
    return easyocr_reader

def preparar_imagen_para_ocr(original_path: str) -> str:
    img = Image.open(original_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")

    max_side = 1800
    width, height = img.size
    scale = min(max_side / max(width, height), 1)

    if scale < 1:
        img = img.resize((int(width * scale), int(height * scale)))

    processed_path = original_path + "_easyocr.jpg"
    img.save(processed_path, "JPEG", quality=92)
    return processed_path

@app.get("/")
def root():
    return {"status": "OCR backend funcionando con EasyOCR"}

@app.post("/ocr")
async def procesar_ocr(file: UploadFile = File(...)):
    temp_path = None
    processed_path = None

    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".jpg"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contenido = await file.read()
            tmp.write(contenido)
            temp_path = tmp.name

        processed_path = preparar_imagen_para_ocr(temp_path)

        print("Procesando con EasyOCR:", processed_path)

        reader = get_easyocr_reader()

        result = reader.readtext(
            processed_path,
            detail=1,
            paragraph=False,
            canvas_size=1800,
            mag_ratio=1.0,
            min_size=10,
            text_threshold=0.5,
            low_text=0.3,
            link_threshold=0.3
        )

        lineas = []

        for item in result:
            try:
                texto = str(item[1]).strip()
                confianza = float(item[2])

                if texto:
                    lineas.append({
                        "texto": texto,
                        "confianza": confianza
                    })
            except Exception as e:
                print("Error leyendo línea EasyOCR:", e)

        return {
            "total": len(lineas),
            "lineas": lineas
        }

    except Exception as e:
        detalle = traceback.format_exc()
        print("ERROR OCR COMPLETO:")
        print(detalle)

        return JSONResponse(
            status_code=500,
            content={
                "error": "Error procesando OCR",
                "detalle": str(e),
                "traceback": detalle
            }
        )

    finally:
        for path in [temp_path, processed_path]:
            if path and os.path.exists(path):
                os.remove(path)
