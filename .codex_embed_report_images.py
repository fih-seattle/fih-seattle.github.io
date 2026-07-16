import os, pathlib, tempfile, zipfile
from xml.etree import ElementTree as ET

base=pathlib.Path(r'C:\GitHub\high-school')
docx=next(base.glob('114*Python_AI*.docx'))
assets=pathlib.Path(r'C:\GitHub\fih-seattle.github.io\.codex_report_assets')
RELNS='http://schemas.openxmlformats.org/package/2006/relationships'
RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CTNS='http://schemas.openxmlformats.org/package/2006/content-types'
with zipfile.ZipFile(docx,'r') as zin:
    entries={n:zin.read(n) for n in zin.namelist()}

rels=ET.fromstring(entries['word/_rels/document.xml.rels'])
mapping={}
for rel in rels:
    if rel.get('Type','').endswith('/image') and rel.get('TargetMode')=='External':
        rid=rel.get('Id'); src=assets/pathlib.Path(rel.get('Target').replace('C://GitHub/fih-seattle.github.io/.codex_report_assets/','')).name
        media=f'image_{rid}.png'; mapping[rid]=(src,media)
        rel.set('Target',f'media/{media}'); rel.attrib.pop('TargetMode',None)
entries['word/_rels/document.xml.rels']=ET.tostring(rels,encoding='utf-8',xml_declaration=True)

doc=entries['word/document.xml'].decode('utf-8')
for rid in mapping:
    doc=doc.replace(f'r:link="{rid}"',f'r:embed="{rid}"')
entries['word/document.xml']=doc.encode('utf-8')

ct=ET.fromstring(entries['[Content_Types].xml'])
if not any(x.get('Extension')=='png' for x in ct):
    ET.SubElement(ct,f'{{{CTNS}}}Default',{'Extension':'png','ContentType':'image/png'})
entries['[Content_Types].xml']=ET.tostring(ct,encoding='utf-8',xml_declaration=True)
for rid,(src,media) in mapping.items(): entries[f'word/media/{media}']=src.read_bytes()

tmp=docx.with_suffix('.embedding.tmp')
with zipfile.ZipFile(tmp,'w',zipfile.ZIP_DEFLATED) as zout:
    for n,b in entries.items(): zout.writestr(n,b)
os.replace(tmp,docx)
print(f'embedded={len(mapping)} file={docx} size={docx.stat().st_size}')
