"""Validate uploads before allocating large buffers or choosing storage filenames."""
from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
FILE_TYPES = {
    'application/pdf': ('.pdf', b'%PDF-'),
    'image/png': ('.png', b'\x89PNG\r\n\x1a\n'),
    'image/jpeg': ('.jpg', b'\xff\xd8\xff'),
    'image/jpg': ('.jpg', b'\xff\xd8\xff'),
}


async def read_validated_upload(file: UploadFile):
    file_type = FILE_TYPES.get(file.content_type)
    if file_type is None:
        raise HTTPException(status_code=400, detail='Only PDF, PNG, and JPEG files are supported.')
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail='File size exceeds the 5MB limit.')
    extension, signature = file_type
    if not content.startswith(signature):
        raise HTTPException(status_code=400, detail='File contents do not match the selected file type.')
    return content, extension
