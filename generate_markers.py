import os
import qrcode
from PIL import Image

MARKERS_DIR = "assets"

def create_patt_file(inner_image, save_path):
    patt_text = ""
    for angle in [0, -90, -180, -270]:
        img = inner_image.convert("RGB")
        rotated = img.rotate(angle, resample=Image.NEAREST, expand=False)
        resized = rotated.resize((16, 16), resample=Image.BILINEAR)
        for y in range(16):
            for x in range(16):
                r, g, b = resized.getpixel((x, y))
                patt_text += f"{b:3} {g:3} {r:3} "
            patt_text += "\n"
        patt_text += "\n"
    with open(save_path, "w") as f:
        f.write(patt_text)

def setup_ar_folder(folder_name):
    target_url = f"https://bpm82.github.io/webar-project/?id={folder_name}"
    black_rgb = (0, 0, 0)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=15,
        border=1,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color=black_rgb, back_color="white").convert('RGB')

    patt_path = os.path.join(MARKERS_DIR, folder_name, "pattern.patt")
    create_patt_file(qr_img, patt_path)

    border_thickness = 240
    new_size = (qr_img.size[0] + border_thickness * 2, qr_img.size[1] + border_thickness * 2)
    final_img = Image.new("RGB", new_size, black_rgb)
    final_img.paste(qr_img, (border_thickness, border_thickness))

    marker_path = os.path.join(MARKERS_DIR, folder_name, "marker.png")
    final_img.save(marker_path)
    print(f"[{folder_name}] 生成完了 → {target_url}")

for item in sorted(os.listdir(MARKERS_DIR)):
    item_path = os.path.join(MARKERS_DIR, item)
    if os.path.isdir(item_path):
        if not os.path.exists(os.path.join(item_path, "pattern.patt")):
            setup_ar_folder(item)
        else:
            print(f"[{item}] スキップ（生成済み）")
