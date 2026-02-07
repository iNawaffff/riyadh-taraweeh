"""S3 audio upload helper."""

import os
import uuid

import boto3


def upload_audio_to_s3(file):
    bucket = os.environ.get("S3_BUCKET", "imams-riyadh-audio")
    ext = os.path.splitext(file.filename)[1] or ".mp3"
    key = f"audio/{uuid.uuid4().hex}{ext}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )
    s3.upload_fileobj(
        file,
        bucket,
        key,
        ExtraArgs={"ContentType": file.content_type or "audio/mpeg"},
    )
    region = os.environ.get("AWS_REGION", "us-east-1")
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
