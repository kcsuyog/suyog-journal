"""Generate the one-page PDF from the same profile data as the website.
Run: uv run --with reportlab --with pypdf scripts/build-resume.py
"""
import json
from pathlib import Path
from html import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
profile = json.loads((root / 'src/data/profile.json').read_text())
output = root / 'public/suyog-kc-resume.pdf'
ink = colors.HexColor('#29245c')
muted = colors.HexColor('#535365')
styles = {
    'name': ParagraphStyle('name', fontName='Helvetica-Bold', fontSize=27, leading=31, textColor=ink, spaceAfter=6),
    'headline': ParagraphStyle('headline', fontSize=12, leading=16, textColor=muted, spaceAfter=10),
    'contact': ParagraphStyle('contact', fontSize=8.5, leading=13, textColor=ink, spaceAfter=12),
    'body': ParagraphStyle('body', fontSize=9.5, leading=14, textColor=colors.HexColor('#252531'), spaceAfter=5),
    'section': ParagraphStyle('section', fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=ink, spaceBefore=12, spaceAfter=7),
    'role': ParagraphStyle('role', fontName='Helvetica-Bold', fontSize=10, leading=14, textColor=ink, spaceAfter=2),
    'meta': ParagraphStyle('meta', fontSize=9, leading=13, textColor=muted, spaceAfter=4),
    'bullet': ParagraphStyle('bullet', fontSize=9.2, leading=13, textColor=colors.HexColor('#252531'), leftIndent=10, firstLineIndent=-8, spaceAfter=3),
}

def para(text, style='body'):
    return Paragraph(text, styles[style])

def plain(text):
    return escape(text.replace('’', "'").replace('–', '-').replace('—', '-'))

def link(url, label):
    return f'<a href="{escape(url, quote=True)}" color="#29245c">{plain(label)}</a>'

story = [para(plain(profile['name']), 'name'), para(plain(profile['headline']), 'headline')]
story.append(para(' | '.join([
    link('mailto:' + profile['email'], profile['email']),
    link(profile['website'], 'suyogkc.netlify.app'),
    link(profile['github'], 'github.com/kcsuyog'),
]) + '<br/>' + link(profile['linkedin'], 'linkedin.com/in/suyogkc'), 'contact'))
story.append(para(plain(profile['summary'])))
story.append(para('  |  '.join('<b>' + plain(h['value']) + '</b> ' + plain(h['label']) for h in profile['highlights'])))
story.append(para('Experience', 'section'))
for item in profile['experience']:
    block = [para(plain(item['company']) + ' <font size="9" color="#535365"> / ' + plain(item['period']) + '</font>', 'role'), para(plain(item['role'] + (' | ' + item['location'] if item['location'] else '')), 'meta')]
    block += [para('- ' + plain(point), 'bullet') for point in item['points']]
    block.append(Spacer(1, 5))
    story.append(KeepTogether(block))
story.append(para('Skills', 'section'))
for skill in profile['skills']:
    story.append(para('<b>' + plain(skill['label']) + ':</b> ' + plain(skill['items'])))
story.append(para('Selected projects', 'section'))
for project in profile['projects']:
    story.append(KeepTogether([para(link(project['url'], project['name']), 'role'), para(plain(project['description']))]))

def decorate(canvas, doc):
    canvas.setFillColor(ink)
    canvas.rect(42, A4[1] - 28, A4[0] - 84, 3, fill=1, stroke=0)

SimpleDocTemplate(str(output), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=43, bottomMargin=36, title='Suyog KC - Resume', author='Suyog KC').build(story, onFirstPage=decorate, onLaterPages=decorate)
reader = PdfReader(output)
assert len(reader.pages) == 1, 'Resume must fit one page; review content and spacing.'
text = reader.pages[0].extract_text()
for expected in [profile['name'], 'Experience', 'Skills', 'Selected projects'] + [plain(item[key]) for item in profile['experience'] for key in ('company', 'period')]:
    assert expected in text, f'Missing resume text: {expected}'
print(f'Created and checked {output} ({len(reader.pages)} page)')
