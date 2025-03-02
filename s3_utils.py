import boto3
import os
from botocore.exceptions import NoCredentialsError, ClientError


def upload_to_s3(local_file_path, s3_file_name=None):
    """
    Upload a file to the S3 bucket

    Parameters:
    local_file_path (str): Path to the local file
    s3_file_name (str): Name to give the file in S3 (if None, uses basename of local file)

    Returns:
    str: URL of the uploaded file if successful, error message otherwise
    """
    # If no S3 filename provided, use the basename of the local file
    if s3_file_name is None:
        s3_file_name = os.path.basename(local_file_path)

    # Get S3 bucket from environment variable
    s3_bucket = os.environ.get('S3_BUCKET', 'imams-riyadh-audio')

    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
    )

    try:
        # Upload file
        s3_client.upload_file(
            local_file_path,
            s3_bucket,
            s3_file_name,
            ExtraArgs={'ContentType': 'audio/mpeg'}  # Set proper content type for audio
        )

        # Generate URL
        url = f"https://{s3_bucket}.s3.amazonaws.com/{s3_file_name}"
        print(f"Uploaded {local_file_path} to {url}")
        return url

    except FileNotFoundError:
        return f"Error: File {local_file_path} not found"
    except NoCredentialsError:
        return "Error: AWS credentials not found"
    except ClientError as e:
        return f"Error: {str(e)}"


def delete_from_s3(s3_file_name):
    """
    Delete a file from the S3 bucket

    Parameters:
    s3_file_name (str): Name of the file in S3 to delete

    Returns:
    bool: True if successful, False otherwise
    """
    # Get S3 bucket from environment variable
    s3_bucket = os.environ.get('S3_BUCKET', 'imams-riyadh-audio')

    # Initialize S3 client
    s3_client = boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
    )

    try:
        s3_client.delete_object(Bucket=s3_bucket, Key=s3_file_name)
        print(f"Deleted {s3_file_name} from S3 bucket {s3_bucket}")
        return True
    except Exception as e:
        print(f"Error deleting {s3_file_name}: {str(e)}")
        return False