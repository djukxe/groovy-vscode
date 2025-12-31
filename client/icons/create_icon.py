#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFont
import os

# Create a 128x128 image with a blue gradient background
width, height = 128, 128
image = Image.new('RGB', (width, height), color='#4298B8')
draw = ImageDraw.Draw(image)

# Create a simple gradient effect
for y in range(height):
    for x in range(width):
        # Simple gradient from top-left to bottom-right
        r = int(66 + (45 - 66) * (x + y) / (width + height))
        g = int(152 + (95 - 152) * (x + y) / (width + height))
        b = int(184 + (115 - 184) * (x + y) / (width + height))
        draw.point((x, y), fill=(r, g, b))

# Try to use a system font, fallback to default if not available
try:
    font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 72)
except:
    try:
        font = ImageFont.truetype("/Library/Fonts/Arial.ttf", 72)
    except:
        font = ImageFont.load_default()

# Draw the white "G" in the center
bbox = draw.textbbox((0, 0), "G", font=font)
text_width = bbox[2] - bbox[0]
text_height = bbox[3] - bbox[1]
x = (width - text_width) // 2
y = (height - text_height) // 2 + 10  # Slight adjustment for better centering

draw.text((x, y), "G", fill="white", font=font)

# Save the image
image.save("icon.png")
print("Icon created successfully!")
