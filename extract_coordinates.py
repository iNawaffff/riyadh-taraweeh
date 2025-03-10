# improved_coordinates.py - Extract coordinates from shortened URLs
import re
import requests
from app import app, db
from models import Mosque


def extract_coordinates():
    with app.app_context():
        mosques = Mosque.query.all()
        updated = 0

        for mosque in mosques:
            if not mosque.map_link:
                continue

            try:
                # Print the current URL we're processing
                print(f"Processing: {mosque.name} - {mosque.map_link}")

                # Follow redirects to get the full URL
                response = requests.head(mosque.map_link, allow_redirects=True)
                full_url = response.url
                print(f"Expanded URL: {full_url}")

                # Try different patterns used by Google Maps
                patterns = [
                    r'@([-+]?\d+\.\d+),([-+]?\d+\.\d+)',  # Standard @lat,lng format
                    r'll=([-+]?\d+\.\d+),([-+]?\d+\.\d+)',  # ll=lat,lng format
                    r'q=([-+]?\d+\.\d+),([-+]?\d+\.\d+)'  # q=lat,lng format
                ]

                for pattern in patterns:
                    match = re.search(pattern, full_url)
                    if match:
                        mosque.latitude = float(match.group(1))
                        mosque.longitude = float(match.group(2))
                        updated += 1
                        print(f"Found coordinates: {mosque.latitude}, {mosque.longitude}")
                        break

            except Exception as e:
                print(f"Error processing {mosque.name}: {e}")

        # Save changes to database
        db.session.commit()
        print(f"Updated coordinates for {updated} out of {len(mosques)} mosques")


if __name__ == "__main__":
    # Add requests if not installed
    try:
        import requests
    except ImportError:
        import pip

        pip.main(['install', 'requests'])
        import requests

    extract_coordinates()