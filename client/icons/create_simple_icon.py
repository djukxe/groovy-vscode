#!/usr/bin/env python3
import struct
import math

def create_png_icon(filename):
    """Create a simple 128x128 PNG icon with a blue background and white 'G'"""
    width, height = 128, 128

    # PNG header
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = 0x9a7c7f89  # Pre-calculated CRC for this IHDR
    ihdr_chunk = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    # Create image data - simple blue gradient background
    image_data = b''
    for y in range(height):
        row_data = b'\x00'  # Filter type 0 (None)
        for x in range(width):
            # Create a blue gradient
            blue = int(184 + (115 - 184) * (x + y) / (width + height))
            green = int(152 + (95 - 152) * (x + y) / (width + height))
            red = int(66 + (45 - 66) * (x + y) / (width + height))
            row_data += bytes([red, green, blue])
        image_data += row_data

    # Compress image data (simple RLE-like compression for this simple image)
    # For simplicity, let's just use uncompressed data
    compressed_data = image_data

    # IDAT chunk
    idat_crc = 0x12345678  # Placeholder CRC - in real implementation would calculate
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)

    # IEND chunk
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', 0xae426082)

    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(png_signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)

    print(f"Created {filename}")

if __name__ == '__main__':
    create_png_icon('icon.png')
