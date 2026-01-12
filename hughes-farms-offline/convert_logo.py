import base64
import os

# The path to your new SVG logo
image_path = "public/farmslogo.svg"

if os.path.exists(image_path):
    with open(image_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        # --- KEY CHANGE HERE ---
        # We now specify 'svg+xml' so browsers and PDFs know how to render it
        print(f'export const logoBase64 = "data:image/svg+xml;base64,{encoded_string}";')
else:
    print(f"Error: Could not find '{image_path}'. Make sure the file exists.")
