import os
import glob

base_dir = r"C:\Users\nitin\.gemini\antigravity-ide\scratch\safesphere"
css_file = os.path.join(base_dir, "css", "style.css")
html_files = glob.glob(os.path.join(base_dir, "*.html"))

with open(css_file, "r", encoding="utf-8") as f:
    css_lines = f.readlines()

new_css_lines = []
in_vars = False
for line in css_lines:
    if ":root {" in line or '[data-theme="dark"] {' in line:
        in_vars = True
    
    if in_vars:
        new_css_lines.append(line)
        if line.strip() == "}":
            in_vars = False
    else:
        # Swap yellow and turquoise in the line
        temp_line = line.replace("yellow", "TEMP_COLOR")
        temp_line = temp_line.replace("turquoise", "yellow")
        temp_line = temp_line.replace("TEMP_COLOR", "turquoise")
        
        # Swap shadow RGBs
        temp_line = temp_line.replace("255, 193, 7", "TEMP_RGB")
        temp_line = temp_line.replace("20, 184, 166", "255, 193, 7")
        temp_line = temp_line.replace("TEMP_RGB", "20, 184, 166")
        
        new_css_lines.append(temp_line)

with open(css_file, "w", encoding="utf-8") as f:
    f.writelines(new_css_lines)

# Swap in HTML files
for h_file in html_files:
    with open(h_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace("yellow", "TEMP_COLOR")
    content = content.replace("turquoise", "yellow")
    content = content.replace("TEMP_COLOR", "turquoise")
    
    with open(h_file, "w", encoding="utf-8") as f:
        f.write(content)

print("Swapped yellow and turquoise successfully!")
