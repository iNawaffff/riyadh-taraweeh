from app import app, db
from models import Imam
from s3_utils import upload_to_s3
import os


def migrate_audio_files():
    with app.app_context():
        # Get all imams with audio samples
        imams = Imam.query.filter(Imam.audio_sample.isnot(None)).all()
        print(f"Found {len(imams)} imams with audio samples")

        for imam in imams:
            # Get current audio path
            current_audio = imam.audio_sample

            # Skip if already an S3 URL
            if current_audio and current_audio.startswith('http'):
                print(f"Imam {imam.name}: Audio already on S3 ({current_audio})")
                continue

            # Construct local file path
            if current_audio.startswith('/'):
                # Remove leading slash if present
                current_audio = current_audio[1:]

            # If path starts with static/audio, use as is, otherwise prepend it
            if not current_audio.startswith('static/audio/'):
                local_path = os.path.join('static', 'audio', os.path.basename(current_audio))
            else:
                local_path = current_audio

            print(f"Imam {imam.name}: Processing audio at {local_path}")

            # Check if file exists
            if not os.path.exists(local_path):
                print(f"  WARNING: File {local_path} not found!")
                continue

            # Upload to S3
            s3_url = upload_to_s3(local_path)

            # Update database if upload successful
            if s3_url and s3_url.startswith('http'):
                imam.audio_sample = s3_url
                print(f"  SUCCESS: Updated audio URL to {s3_url}")
            else:
                print(f"  ERROR: Upload failed - {s3_url}")

        # Commit all changes
        try:
            db.session.commit()
            print("All changes committed to database")
        except Exception as e:
            db.session.rollback()
            print(f"Error committing changes: {str(e)}")


if __name__ == "__main__":
    migrate_audio_files()