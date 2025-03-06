import re

def normalize_arabic(text):
    """
    normalizing Arabic text to standardize different forms of letters,
    remove tashkeel, and handle spacing for improved search.
    """
    if not text:
        return ""

    # converting to string
    text = str(text)

    # replace various forms of Alif
    text = re.sub('[إأآا]', 'ا', text)

    # replace various forms of Yaa
    text = re.sub('[يى]', 'ي', text)

    # replace Taa Marbuth with Ha
    text = re.sub('ة', 'ه', text)

    # remove Tashkeel
    text = re.sub('[\u064B-\u0652]', '', text)

    # Remove Tatweel
    text = re.sub('\u0640', '', text)

    # standardize the spacing
    text = ' '.join(text.split())

    return text.lower()  # Convert to lowercase for case-insensitivity