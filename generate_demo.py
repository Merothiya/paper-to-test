import json
import fitz
import io
import base64
from PIL import Image

pdf_path = "_INI CET May 2023_260930_145125.pdf"
doc = fitz.open(pdf_path)

with open('_dump2.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

Q = d['Q']
I = d['I']
key = d.get('key', {})

def cm(p, y):
    return p * 100000 + y

# Group images by question
assigned = {}
for i, q in enumerate(Q):
    s = cm(q['p'], q['ySeq']) - 4
    next_q = Q[i+1] if i + 1 < len(Q) else None
    en = cm(next_q['p'], next_q['ySeq']) - 4 if next_q else float('inf')
    
    matches = [img for img in I if cm(img['p'], img['ySeq']) >= s and cm(img['p'], img['ySeq']) < en]
    if matches:
        assigned[q['no']] = matches

print(f"Questions receiving images: {len(assigned)}")

clean_q_list = []
total_img_count = 0
total_b64_bytes = 0

for i, q in enumerate(Q):
    q_no = q['no']
    imgs_b64 = []
    
    if q_no in assigned:
        for img_box in assigned[q_no]:
            p = img_box['p']
            page = doc[p - 1]
            rect = fitz.Rect(
                max(0, img_box['x0'] - 4),
                max(0, img_box['t'] - 4),
                min(page.rect.width, img_box['x1'] + 4),
                min(page.rect.height, img_box['b'] + 4)
            )
            pix = page.get_pixmap(clip=rect, dpi=110)
            if pix.width < 10 or pix.height < 10:
                continue
            
            img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
            if img.width > 560:
                ratio = 560 / img.width
                img = img.resize((560, int(img.height * ratio)), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=72, optimize=True)
            b64_data = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')
            imgs_b64.append(b64_data)
            total_img_count += 1
            total_b64_bytes += len(b64_data)
            
    ans = q.get('inl')
    if ans is None or ans < 0:
        ans = key.get(str(q_no), key.get(q_no, -1))
        
    clean_q_list.append({
        "no": q_no,
        "sub": q.get('sub', ''),
        "stem": q.get('stem', ''),
        "o": q.get('o', []),
        "ans": ans,
        "img": imgs_b64,
        "exp": q.get('exp', '')
    })

demo_data = {
    "title": "INI CET May 2023 Mock Exam (200 MCQs)",
    "min": 180,
    "q": clean_q_list
}

with open('demo_test.json', 'w', encoding='utf-8') as f:
    json.dump(demo_data, f, ensure_ascii=False)

print(f"Successfully generated demo_test.json!")
print(f"Total Questions: {len(clean_q_list)}")
print(f"Total Questions with images: {len([q for q in clean_q_list if len(q['img']) > 0])}")
print(f"Total Images attached: {total_img_count}")
print(f"Total base64 image payload: {round(total_b64_bytes / 1024)} KB")
