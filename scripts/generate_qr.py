import os
import qrcode

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets')
BASE_URL = 'https://bpm82.github.io/webar-project/?id='

def generate_qr_codes():
    assets_path = os.path.abspath(ASSETS_DIR)
    for entry in os.listdir(assets_path):
        folder_path = os.path.join(assets_path, entry)
        if not os.path.isdir(folder_path):
            continue
        qr_path = os.path.join(folder_path, 'qr.png')
        if os.path.exists(qr_path):
            print(f'Skipping {entry}: qr.png already exists')
            continue
        url = BASE_URL + entry
        img = qrcode.make(url)
        img.save(qr_path)
        print(f'Generated qr.png for {entry}: {url}')

if __name__ == '__main__':
    generate_qr_codes()
