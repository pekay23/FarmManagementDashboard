import base64
import os

image_path = "public/farmslogo.png"

if os.path.exists(image_path):
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        # This formats it perfectly for your React code
        print(f'const logoBase64 = "data:image/png;base64,{encoded_string}";')
else:
    print(f"Error: Could not find '{image_path}'. Make sure the file name is correct.")
