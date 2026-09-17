import io
from fastapi import UploadFile
from pypdf import PdfReader
from docx import Document
from pptx import Presentation


async def extract_text_from_upload(file: UploadFile) -> str:
    """Read an uploaded file entirely in memory and pull out plain text.
    Nothing is written to disk, in keeping with the 'don't persist raw
    uploads' approach for this project.
    """
    ext = file.filename.lower().rsplit(".", 1)[-1]
    raw = await file.read()
    buffer = io.BytesIO(raw)

    if ext == "pdf":
        reader = PdfReader(buffer)
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    elif ext == "docx":
        doc = Document(buffer)
        return "\n".join(p.text for p in doc.paragraphs)

    elif ext == "pptx":
        prs = Presentation(buffer)
        lines = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        for run in para.runs:
                            lines.append(run.text)
        return "\n".join(lines)

    elif ext == "txt":
        return raw.decode("utf-8", errors="ignore")

    else:
        raise ValueError(f"Unsupported file type: .{ext}")