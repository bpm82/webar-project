import os
import qrcode
from PIL import Image

MARKERS_DIR = "assets"

def create_patt_file(inner_image, save_path):
    """
    Generate AR.js .patt file following the official AR.js marker training generator approach.
    Reference: https://jeromeetienne.github.io/AR.js/three.js/examples/marker-training/examples/generator.html

    Steps:
    1. Convert inner marker image to grayscale
    2. Generate 4 rotations (0, 90, 180, 270 degrees counter-clockwise)
    3. Resize each rotation to 16x16
    4. Output pixel values in R G B format (each channel = grayscale value)
    """
    # Convert to grayscale then back to RGB so each channel holds the same luminance value
    grayscale_rgb = inner_image.convert("L").convert("RGB")

    rows = []
    for angle in [0, 90, 180, 270]:
        rotated = grayscale_rgb.rotate(angle, resample=Image.BILINEAR, expand=False)
        resized = rotated.resize((16, 16), resample=Image.LANCZOS)
        for y in range(16):
            pixels = [f"{r:3} {g:3} {b:3} " for x in range(16) for r, g, b in [resized.getpixel((x, y))]]
            rows.append("".join(pixels))
        rows.append("")

    patt_text = "\n".join(rows) + "\n"

    with open(save_path, "w") as f:
        f.write(patt_text)

def setup_ar_folder(folder_name):
    target_url = f"https://bpm82.github.io/webar-project/?id={folder_name}"

    # Step 1: Generate QR code image
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=(0, 0, 0), back_color="white").convert("RGB")

    # Step 2: Create marker image with black border
    # AR.js standard: border thickness = 50% of inner content width on each side
    inner_width = qr_img.size[0]
    inner_height = qr_img.size[1]
    border_thickness = inner_width // 2
    new_size = (inner_width + border_thickness * 2, inner_height + border_thickness * 2)

    final_img = Image.new("RGB", new_size, (0, 0, 0))
    final_img.paste(qr_img, (border_thickness, border_thickness))

    marker_path = os.path.join(MARKERS_DIR, folder_name, "marker.png")
    final_img.save(marker_path)

    # Step 3: Extract inner content from the marker (mirrors the official generator approach)
    inner_content = final_img.crop((
        border_thickness,
        border_thickness,
        border_thickness + inner_width,
        border_thickness + inner_height,
    ))

    # Step 4: Generate .patt file from the inner content
    patt_path = os.path.join(MARKERS_DIR, folder_name, "pattern.patt")
    create_patt_file(inner_content, patt_path)

    print(f"[{folder_name}] 生成完了 → {target_url}")

for item in sorted(os.listdir(MARKERS_DIR)):
    item_path = os.path.join(MARKERS_DIR, item)
    if os.path.isdir(item_path):
        if not os.path.exists(os.path.join(item_path, "pattern.patt")):
            setup_ar_folder(item)
        else:
            print(f"[{item}] スキップ（生成済み）")
