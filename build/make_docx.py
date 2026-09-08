# -*- coding: utf-8 -*-
import sys
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from questions import SECTIONS

BLUE = RGBColor(0x2A,0x63,0x96); GOLD = RGBColor(0xE8,0xA8,0x58); ORANGE = RGBColor(0xC4,0x7D,0x22)
DARK = RGBColor(0x12,0x18,0x26); GREY = RGBColor(0x7F,0x83,0x8F)
FONT = "Century Gothic"

def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd'); shd.set(qn('w:val'),'clear'); shd.set(qn('w:color'),'auto'); shd.set(qn('w:fill'),hexcolor)
    tcPr.append(shd)

def no_borders(table):
    tbl = table._tbl; tblPr = tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for e in ('top','left','bottom','right','insideH','insideV'):
        el = OxmlElement(f'w:{e}'); el.set(qn('w:val'),'nil'); b.append(el)
    tblPr.append(b)

def light_borders(table):
    tbl = table._tbl; tblPr = tbl.tblPr
    b = OxmlElement('w:tblBorders')
    for e in ('top','left','bottom','right','insideH','insideV'):
        el = OxmlElement(f'w:{e}'); el.set(qn('w:val'),'single'); el.set(qn('w:sz'),'4'); el.set(qn('w:color'),'E4E8ED'); b.append(el)
    tblPr.append(b)

def run(p, text, size=10.5, bold=False, color=DARK, italic=False, caps=False):
    r = p.add_run(text); r.font.name = FONT; r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic
    r.font.color.rgb = color; r.font.all_caps = caps
    r._element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    return r

def para(doc_or_cell, text="", size=10.5, bold=False, color=DARK, align=None, before=0, after=4, italic=False, caps=False):
    p = doc_or_cell.add_paragraph()
    p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
    if align: p.alignment = align
    if text: run(p, text, size, bold, color, italic, caps)
    return p

def band(doc, lines):
    """Full-width green band with centered text lines [(text,size,bold,color)]"""
    t = doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER; no_borders(t)
    c = t.rows[0].cells[0]; shade(c, '2F6EA6')
    c.paragraphs[0].paragraph_format.space_before = Pt(6)
    first = True
    for text,size,bold,color in lines:
        p = c.paragraphs[0] if first else c.add_paragraph(); first = False
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(3); p.paragraph_format.space_before = Pt(3)
        run(p, text, size, bold, color)
    c.paragraphs[-1].paragraph_format.space_after = Pt(8)
    return t

def section_header(doc, letter, title, sub=None):
    t = doc.add_table(rows=1, cols=2); no_borders(t)
    t.columns[0].width = Cm(1.6); t.columns[1].width = Cm(15.4)
    a, b = t.rows[0].cells; a.width = Cm(1.6); b.width = Cm(15.4)
    shade(a, 'E8A858'); shade(b, '2F6EA6')
    pa = a.paragraphs[0]; pa.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(pa, letter, 16, True, RGBColor(0xFF,0xFF,0xFF))
    pb = b.paragraphs[0]; run(pb, title.upper(), 11, True, RGBColor(0xFF,0xFF,0xFF))
    if sub:
        p2 = b.add_paragraph(); run(p2, sub, 8.5, False, RGBColor(0xD6,0xE6,0xF2), italic=True)
    for c in (a,b):
        c.paragraphs[0].paragraph_format.space_before = Pt(4); c.paragraphs[-1].paragraph_format.space_after = Pt(4)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def footer_text(section, text):
    p = section.footer.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, text, 7.5, False, RGBColor(0x9A,0xA3,0xAE), caps=True)

def build(path, with_key=True):
    doc = Document()
    st = doc.styles['Normal']; st.font.name = FONT; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    sec = doc.sections[0]
    sec.page_height = Cm(29.7); sec.page_width = Cm(21.0)
    sec.left_margin = sec.right_margin = Cm(2.0); sec.top_margin = Cm(1.6); sec.bottom_margin = Cm(1.6)
    footer_text(sec, "Semaine de l'Indépendance · An 68 · République de Guinée · Quiz Simandou")

    # ---------- Cover ----------
    para(doc, "RÉPUBLIQUE DE GUINÉE", 9, True, BLUE, WD_ALIGN_PARAGRAPH.CENTER, after=0)
    para(doc, "Travail · Justice · Solidarité", 8.5, False, ORANGE, WD_ALIGN_PARAGRAPH.CENTER, after=10, italic=True)
    band(doc, [("SEMAINE DE L'INDÉPENDANCE · AN 68", 9, True, GOLD),
               ("QUIZ SIMANDOU", 26, True, RGBColor(0xFF,0xFF,0xFF)),
               ("Questionnaire à choix multiples — 40 questions", 11, False, RGBColor(0xE3,0xED,0xF3)),
               ("De l'indépendance de 1958 à la Guinée de Simandou 2040", 9, False, RGBColor(0xD6,0xE6,0xF2))])
    para(doc, "« S'inspirer du passé pour construire ensemble l'avenir : NOTRE JEUNESSE »", 9.5, False, BLUE, WD_ALIGN_PARAGRAPH.CENTER, before=8, after=10, italic=True)

    # Identity box
    t = doc.add_table(rows=2, cols=4); light_borders(t); t.autofit = False
    for w,col in zip((Cm(3.6),Cm(4.9),Cm(3.6),Cm(4.9)), t.columns): col.width = w
    labels = [("Nom et prénom(s)",""),("Structure / Établissement",""),("Région / Préfecture",""),("Score            / 40","")]
    for i,(lab,_) in enumerate(labels):
        c = t.rows[i//2*1 if False else (0 if i<2 else 1)].cells[(i%2)*2]
        shade(c,'EDF3F8'); p = c.paragraphs[0]; run(p, lab, 8.5, True, BLUE)
        d = t.rows[0 if i<2 else 1].cells[(i%2)*2+1]; d.paragraphs[0].paragraph_format.space_after = Pt(10)
    for r in t.rows:
        for j,c in enumerate(r.cells): c.width = Cm(3.6) if j%2==0 else Cm(4.9)
    para(doc, "", after=2)

    # Instructions
    t = doc.add_table(rows=1, cols=1); no_borders(t); c = t.rows[0].cells[0]; shade(c,'EDF3F8')
    p = c.paragraphs[0]; run(p, "CONSIGNES", 9, True, BLUE); p.paragraph_format.space_before = Pt(4)
    for line in ["Chaque question comporte quatre propositions (A, B, C, D). Une seule réponse est correcte.",
                 "Cochez la case correspondant à votre réponse ou reportez-la sur la grille de réponses.",
                 "Barème : 1 point par bonne réponse, aucun point retiré en cas d'erreur. Total : 40 points.",
                 "Durée indicative : 30 minutes." + (" Le corrigé commenté figure en fin de document." if with_key else " Remettez votre grille de réponses à l'animateur.")]:
        q = c.add_paragraph(); q.paragraph_format.space_after = Pt(2); run(q, "•  " + line, 9.5, False, DARK)
    c.paragraphs[-1].paragraph_format.space_after = Pt(6)

    # Sections overview
    para(doc, "", after=2)
    t = doc.add_table(rows=1, cols=4); no_borders(t)
    for i,(letter,title,qs) in enumerate(SECTIONS):
        c = t.rows[0].cells[i]; shade(c,'2F6EA6')
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p, letter, 18, True, GOLD)
        p2 = c.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p2, title, 8.5, True, RGBColor(0xFF,0xFF,0xFF))
        p3 = c.add_paragraph(); p3.alignment = WD_ALIGN_PARAGRAPH.CENTER; run(p3, f"{len(qs)} questions", 8, False, RGBColor(0xD6,0xE6,0xF2))
        p3.paragraph_format.space_after = Pt(6)
    doc.add_page_break()

    # ---------- Questions ----------
    n = 0
    for letter,title,qs in SECTIONS:
        section_header(doc, letter, title, f"Questions {n+1} à {n+len(qs)}")
        for q,opts,ans,expl in qs:
            n += 1
            p = para(doc, "", before=4, after=2); p.paragraph_format.keep_with_next = True
            run(p, f"{n:02d}.  ", 10.5, True, ORANGE); run(p, q, 10.5, True, DARK)
            for k,o in enumerate(opts):
                po = doc.add_paragraph(); po.paragraph_format.left_indent = Cm(0.9); po.paragraph_format.space_after = Pt(1)
                po.paragraph_format.keep_with_next = (k < 3)
                run(po, "☐  ", 10.5, False, BLUE); run(po, f"{'ABCD'[k]}.  ", 10, True, BLUE); run(po, o, 10, False, DARK)
        para(doc, "", after=4)

    # ---------- Answer grid ----------
    doc.add_page_break()
    section_header(doc, "✓", "Grille de réponses", "À remettre à l'animateur — entourez ou cochez la lettre choisie")
    t = doc.add_table(rows=11, cols=8); light_borders(t); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j in range(4):
        h = t.rows[0].cells[j*2]; shade(h,'2F6EA6'); p=h.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,"N°",9,True,RGBColor(0xFF,0xFF,0xFF))
        h2 = t.rows[0].cells[j*2+1]; shade(h2,'2F6EA6'); p=h2.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,"Réponse",9,True,RGBColor(0xFF,0xFF,0xFF))
    for i in range(10):
        for j in range(4):
            num = j*10 + i + 1
            c = t.rows[i+1].cells[j*2]; shade(c,'EDF3F8'); p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,f"{num:02d}",9.5,True,BLUE)
            d = t.rows[i+1].cells[j*2+1]; p=d.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(p,"A    B    C    D",9.5,False,GREY)
            p.paragraph_format.space_before = Pt(3); p.paragraph_format.space_after = Pt(3)
    para(doc,"",after=6)
    t2 = doc.add_table(rows=1, cols=1); light_borders(t2); c=t2.rows[0].cells[0]
    p=c.paragraphs[0]; run(p,"Score : ______ / 40     ",10,True,BLUE); run(p,"Mention :  ☐ 36-40 Expert Simandou   ☐ 28-35 Bâtisseur   ☐ 20-27 Citoyen éclairé   ☐ < 20 À approfondir",9,False,DARK)
    p.paragraph_format.space_before=Pt(4); p.paragraph_format.space_after=Pt(4)

    # ---------- Answer key ----------
    if with_key:
        doc.add_page_break()
        section_header(doc, "★", "Corrigé commenté", "Réservé à l'animateur / au jury")
        n = 0
        for letter,title,qs in SECTIONS:
            p = para(doc, f"{letter} · {title}", 10, True, BLUE, before=6, after=3, caps=True)
            t = doc.add_table(rows=0, cols=3); light_borders(t); t.autofit = False
            for w,col in zip((Cm(1.2),Cm(1.6),Cm(14.2)), t.columns): col.width = w
            for q,opts,ans,expl in qs:
                n += 1
                r = t.add_row().cells
                r[0].width = Cm(1.2); r[1].width = Cm(1.6); r[2].width = Cm(14.2)
                shade(r[0],'EDF3F8'); pp=r[0].paragraphs[0]; pp.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(pp,f"{n:02d}",9.5,True,BLUE)
                shade(r[1],'2F6EA6'); pp=r[1].paragraphs[0]; pp.alignment=WD_ALIGN_PARAGRAPH.CENTER; run(pp,'ABCD'[ans],11,True,GOLD)
                pp=r[2].paragraphs[0]; run(pp, opts[ans], 9.5, True, DARK)
                p2=r[2].add_paragraph(); run(p2, expl, 8.5, False, GREY, italic=True); p2.paragraph_format.space_after=Pt(2)
                for c in r: c.paragraphs[0].paragraph_format.space_before = Pt(2)
        para(doc, "", after=4)
        para(doc, "Sources : Rio Tinto (résultats T1 2026), Winning Consortium Simandou, Présidence de la République de Guinée, Africa24, Agence Ecofin, Africaguinee (programme Simandou 2040, oct. 2025).", 7.5, False, GREY, italic=True)

    doc.save(path)

build("/Users/mudu/Simandou-Quiz/Quiz Simandou An 68 - Questionnaire et Corrige.docx", True)
build("/Users/mudu/Simandou-Quiz/Quiz Simandou An 68 - Questionnaire participants.docx", False)
print("done")
