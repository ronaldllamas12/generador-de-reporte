from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import cloudinary
import cloudinary.uploader
from app.core.config import get_settings
from fastapi import UploadFile


class CloudinaryService:
    def __init__(self) -> None:
        self.settings = get_settings()

        if not self.settings.use_cloudinary_uploads:
            return

        if not (
            self.settings.cloudinary_cloud_name
            and self.settings.cloudinary_api_key
            and self.settings.cloudinary_api_secret
        ):
            raise RuntimeError(
                "Cloudinary no esta configurado. Define CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en backend/.env"
            )

        cloudinary.config(
            cloud_name=self.settings.cloudinary_cloud_name,
            api_key=self.settings.cloudinary_api_key,
            api_secret=self.settings.cloudinary_api_secret,
            secure=True,
        )

    async def upload_image(self, upload: UploadFile, category: str) -> str | None:
        if upload is None:
            return None

        content = await upload.read()
        if not content:
            return None

        # When Cloudinary is disabled, save the file into the local `static/uploads` directory
        if not self.settings.use_cloudinary_uploads:
            # settings.uploads_dir defaults to app/static/uploads/evidence
            uploads_dir = Path(self.settings.uploads_dir)
            # create category subfolder
            target_dir = uploads_dir / category
            target_dir.mkdir(parents=True, exist_ok=True)

            suffix = Path(upload.filename or "img").suffix or ".jpg"
            filename = f"{uuid4()}{suffix}"
            file_path = target_dir / filename
            # Write bytes to disk
            with open(file_path, "wb") as f:
                f.write(content)

            # Return a URL path served by StaticFiles mounted at '/static'
            # settings.uploads_dir is inside app/static, so compute relative path
            try:
                # compute relative to app/static
                static_root = Path(__file__).resolve().parents[1] / "static"
                rel_path = file_path.relative_to(static_root)
                return f"/static/{rel_path.as_posix()}"
            except Exception:
                # fallback to absolute file path
                return str(file_path)

        suffix = Path(upload.filename or "img").suffix or ".jpg"
        folder = f"{self.settings.cloudinary_folder}/{category}".strip("/")
        result = cloudinary.uploader.upload(
            BytesIO(content),
            folder=folder,
            public_id=str(uuid4()),
            resource_type="image",
            overwrite=False,
        )
        return result.get("secure_url")
