const fs = await import('node:fs/promises');
const path = await import('node:path');
const { Presentation, PresentationFile } = await import('@oai/artifact-tool');

const W = 1280;
const H = 720;
const OUT_DIR = path.resolve('C:/Users/simon/Desktop/Projektový manažment/Profile_autofiller/docs/presentation/out');
const SCRATCH_DIR = path.resolve('C:/Users/simon/Desktop/Projektový manažment/Profile_autofiller/tmp/slides/formego-presentation');
const PREVIEW_DIR = path.join(SCRATCH_DIR, 'preview');
const INSPECT_PATH = path.join(SCRATCH_DIR, 'inspect.ndjson');

const ROOT = path.resolve('C:/Users/simon/Desktop/Projektový manažment/Profile_autofiller');
const DOCS = path.join(ROOT, 'docs');
const ASSETS = path.join(DOCS, 'assets');
const NOTION = path.join(DOCS, 'Export_notion');

const IMG = {
  logoWordmark: path.join(ASSETS, 'logo_s_nazvom.png'),
  logoIcon: path.join(ASSETS, 'logo_2.png'),
  shot1: path.join(ASSETS, 'shot-1.png'),
  shot2: path.join(ASSETS, 'shot-2.png'),
  shot3: path.join(ASSETS, 'shot-3.png'),
  shot4: path.join(ASSETS, 'shot-4.png'),
  shot5: path.join(ASSETS, 'shot-5.png'),
  shot6: path.join(ASSETS, 'shot-6.png'),
  shot7: path.join(ASSETS, 'shot-7.png'),
  survey: path.join(NOTION, 'image 5.png'),
  qr: path.join(DOCS, 'formego-qr.png'),
};

const COLOR = {
  bg: '#08111F',
  bgSoft: '#0E1A2B',
  panel: '#102038',
  panelSoft: '#142842',
  panelGlass: '#102038E8',
  line: '#84ABE72E',
  text: '#EDF5FF',
  textSoft: '#ABC0DE',
  accent: '#57A8FF',
  accent2: '#86C0FF',
  mint: '#7FE0BE',
  gold: '#F6C768',
  coral: '#FF7B72',
  whiteSoft: '#F6FAFF',
  dark: '#06101B',
};

const FONT = {
  title: 'Georgia',
  body: 'Trebuchet MS',
  mono: 'Consolas',
};

const inspect = [];

async function ensureDirs() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
}

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function line(fill = '#00000000', width = 0) {
  return { style: 'solid', fill, width };
}

function record(kind, slideNo, payload = {}) {
  inspect.push({ kind, slide: slideNo, ...payload });
}

function addShape(slide, slideNo, geometry, position, fill, stroke = '#00000000', strokeWidth = 0, role = geometry) {
  const shape = slide.shapes.add({ geometry, position, fill, line: line(stroke, strokeWidth) });
  record('shape', slideNo, { role, bbox: [position.left, position.top, position.width, position.height] });
  return shape;
}

function addText(slide, slideNo, text, position, options = {}) {
  const shape = addShape(
    slide,
    slideNo,
    options.geometry || 'rect',
    position,
    options.fill || '#00000000',
    options.stroke || '#00000000',
    options.strokeWidth || 0,
    options.role || 'text',
  );
  shape.text = text;
  shape.text.fontSize = options.fontSize || 24;
  shape.text.color = options.color || COLOR.text;
  shape.text.bold = Boolean(options.bold);
  shape.text.typeface = options.typeface || FONT.body;
  shape.text.alignment = options.align || 'left';
  shape.text.verticalAlignment = options.valign || 'top';
  shape.text.insets = options.insets || { left: 0, right: 0, top: 0, bottom: 0 };
  shape.text.autoFit = options.autoFit || 'shrinkText';
  record('textbox', slideNo, {
    role: options.role || 'text',
    text: String(text),
    bbox: [position.left, position.top, position.width, position.height],
  });
  return shape;
}

async function addImage(slide, slideNo, imagePath, position, options = {}) {
  const image = slide.images.add({
    blob: await readImageBlob(imagePath),
    fit: options.fit || 'cover',
    alt: options.alt || path.basename(imagePath),
  });
  image.position = position;
  if (options.crop) {
    image.crop = options.crop;
  }
  record('image', slideNo, {
    role: options.role || 'image',
    path: imagePath,
    bbox: [position.left, position.top, position.width, position.height],
  });
  return image;
}

function addBg(slide, slideNo) {
  slide.background.fill = COLOR.bg;
  addShape(slide, slideNo, 'ellipse', { left: -80, top: -120, width: 420, height: 420 }, '#57A8FF24', '#00000000', 0, 'bg glow');
  addShape(slide, slideNo, 'ellipse', { left: 960, top: -110, width: 360, height: 360 }, '#7FE0BE1A', '#00000000', 0, 'bg glow');
  addShape(slide, slideNo, 'ellipse', { left: 860, top: 500, width: 340, height: 220 }, '#57A8FF14', '#00000000', 0, 'bg glow');
}

function addSectionTitle(slide, slideNo, kicker, title, subtitle = '') {
  addText(slide, slideNo, kicker.toUpperCase(), { left: 72, top: 42, width: 260, height: 22 }, {
    fontSize: 13,
    color: COLOR.mint,
    bold: true,
    typeface: FONT.mono,
    autoFit: null,
    role: 'kicker',
  });
  addText(slide, slideNo, title, { left: 72, top: 74, width: 760, height: 72 }, {
    fontSize: 34,
    color: COLOR.text,
    bold: true,
    typeface: FONT.title,
    role: 'title',
  });
  if (subtitle) {
    addText(slide, slideNo, subtitle, { left: 74, top: 146, width: 820, height: 44 }, {
      fontSize: 18,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'subtitle',
    });
  }
}

function addPanel(slide, slideNo, position, role = 'panel', accent = null) {
  addShape(slide, slideNo, 'roundRect', position, COLOR.panelGlass, COLOR.line, 1.2, role);
  if (accent) {
    addShape(slide, slideNo, 'rect', { left: position.left, top: position.top, width: 8, height: position.height }, accent, '#00000000', 0, `${role} accent`);
  }
}

function addPill(slide, slideNo, text, position, fill = '#11233A', color = COLOR.textSoft) {
  addText(slide, slideNo, text, position, {
    geometry: 'roundRect',
    fill,
    fontSize: 15,
    color,
    bold: true,
    align: 'center',
    valign: 'middle',
    typeface: FONT.body,
    role: 'pill',
  });
}

function addArrow(slide, slideNo, x, y, width = 54) {
  addText(slide, slideNo, '→', { left: x, top: y, width, height: 36 }, {
    fontSize: 28,
    color: COLOR.accent2,
    bold: true,
    align: 'center',
    autoFit: null,
    role: 'arrow',
  });
}

async function slide1(p) {
  const slideNo = 1;
  const slide = p.slides.add();
  addBg(slide, slideNo);

  addShape(slide, slideNo, 'roundRect', { left: 54, top: 48, width: 1172, height: 624 }, '#0F1B2DED', COLOR.line, 1.4, 'hero shell');
  addShape(slide, slideNo, 'rect', { left: 54, top: 48, width: 14, height: 624 }, COLOR.accent, '#00000000', 0, 'hero accent');

  await addImage(slide, slideNo, IMG.logoWordmark, { left: 94, top: 86, width: 250, height: 66 }, { fit: 'contain', role: 'logo' });
  addText(slide, slideNo, 'FORMeGO', { left: 94, top: 182, width: 420, height: 70 }, {
    fontSize: 50,
    bold: true,
    typeface: FONT.title,
    role: 'cover title',
  });
  addText(slide, slideNo, 'Rozšírenie pre rýchle vypĺňanie formulárov cez uložené profily.', { left: 96, top: 260, width: 450, height: 76 }, {
    fontSize: 22,
    color: COLOR.textSoft,
    typeface: FONT.body,
    role: 'cover subtitle',
  });

  addPill(slide, slideNo, 'Manifest V3', { left: 96, top: 354, width: 150, height: 38 }, '#17314F', COLOR.text);
  addPill(slide, slideNo, 'Šifrovaný vault', { left: 258, top: 354, width: 180, height: 38 }, '#16384B', COLOR.text);
  addPill(slide, slideNo, 'Chrome + Edge', { left: 450, top: 354, width: 166, height: 38 }, '#1A3040', COLOR.text);

  addPanel(slide, slideNo, { left: 94, top: 454, width: 460, height: 144 }, 'meta panel', COLOR.mint);
  addText(slide, slideNo, 'Autor', { left: 120, top: 482, width: 100, height: 24 }, {
    fontSize: 15,
    color: COLOR.mint,
    bold: true,
    typeface: FONT.mono,
    autoFit: null,
    role: 'meta label',
  });
  addText(slide, slideNo, 'Simon Čalík', { left: 120, top: 510, width: 180, height: 34 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.body,
    role: 'meta value',
  });
  addText(slide, slideNo, 'Predmet', { left: 320, top: 482, width: 100, height: 24 }, {
    fontSize: 15,
    color: COLOR.mint,
    bold: true,
    typeface: FONT.mono,
    autoFit: null,
    role: 'meta label',
  });
  addText(slide, slideNo, 'Projektový manažment', { left: 320, top: 510, width: 210, height: 34 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.body,
    role: 'meta value',
  });
  addText(slide, slideNo, 'Rok 2026', { left: 120, top: 552, width: 160, height: 26 }, {
    fontSize: 18,
    color: COLOR.textSoft,
    typeface: FONT.body,
    role: 'meta detail',
  });

  addPanel(slide, slideNo, { left: 640, top: 92, width: 520, height: 510 }, 'showcase panel');
  addShape(slide, slideNo, 'roundRect', { left: 674, top: 124, width: 378, height: 242 }, '#0A1322', COLOR.line, 1, 'showcase frame');
  await addImage(slide, slideNo, IMG.shot1, { left: 686, top: 136, width: 354, height: 218 }, { role: 'cover screenshot', fit: 'cover' });
  addShape(slide, slideNo, 'roundRect', { left: 920, top: 300, width: 208, height: 256 }, '#0A1322', COLOR.line, 1, 'showcase phone');
  await addImage(slide, slideNo, IMG.shot2, { left: 932, top: 312, width: 184, height: 232 }, { role: 'cover screenshot', fit: 'cover' });
  addShape(slide, slideNo, 'roundRect', { left: 706, top: 392, width: 238, height: 150 }, '#0A1322', COLOR.line, 1, 'showcase mini');
  await addImage(slide, slideNo, IMG.shot6, { left: 718, top: 404, width: 214, height: 126 }, { role: 'cover screenshot', fit: 'cover' });

  slide.speakerNotes.setText('FORMeGO je Chrome a Edge rozšírenie na rýchle vypĺňanie formulárov. Slide predstavuje identitu produktu, autora, predmet a vizuálny jazyk.');
}

async function slide2(p) {
  const slideNo = 2;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Prečo? Kto? Čo?', 'Problém, cieľový používateľ a riešenie', 'Jeden slide, ktorý vysvetlí hodnotu produktu bez dlhého rozprávania.');

  const cards = [
    {
      x: 72,
      label: 'Prečo?',
      title: 'Formuláre sú otravne opakované',
      body: 'Meno, kontakt, adresa či firemné údaje sa vypisujú stále dokola. FORMeGO skracuje tento opakovaný krok na jeden výber profilu.',
      accent: COLOR.accent,
    },
    {
      x: 438,
      label: 'Kto?',
      title: 'Študenti, rodičia, freelanceri, firmy',
      body: 'Každý, kto pracuje s viacerými identitami alebo kontaktmi. Typické profily: ja, rodina, pracovný kontakt, firma.',
      accent: COLOR.mint,
    },
    {
      x: 804,
      label: 'Čo?',
      title: 'Chrome/Edge extension s profilmi',
      body: 'Rozšírenie zobrazí popover pri formulári, používateľ vyberie profil a systém doplní relevantné polia v rámci formulára.',
      accent: COLOR.gold,
    },
  ];

  for (const card of cards) {
    addPanel(slide, slideNo, { left: card.x, top: 244, width: 326, height: 332 }, `card ${card.label}`, card.accent);
    addText(slide, slideNo, card.label, { left: card.x + 28, top: 272, width: 120, height: 28 }, {
      fontSize: 16,
      color: card.accent,
      bold: true,
      typeface: FONT.mono,
      role: 'card eyebrow',
      autoFit: null,
    });
    addText(slide, slideNo, card.title, { left: card.x + 28, top: 312, width: 268, height: 82 }, {
      fontSize: 28,
      bold: true,
      typeface: FONT.title,
      role: 'card title',
    });
    addText(slide, slideNo, card.body, { left: card.x + 28, top: 410, width: 268, height: 124 }, {
      fontSize: 18,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'card body',
    });
  }

  addPill(slide, slideNo, '1 klik namiesto ručného vypisovania', { left: 72, top: 616, width: 366, height: 40 }, '#16314C', COLOR.text);
  addPill(slide, slideNo, 'Viac profilov + heuristické mapovanie polí', { left: 456, top: 616, width: 404, height: 40 }, '#153842', COLOR.text);
  addPill(slide, slideNo, 'Lokálne rozšírenie bez zložitej inštalácie', { left: 878, top: 616, width: 328, height: 40 }, '#1B3243', COLOR.text);

  slide.speakerNotes.setText('Na tomto slide vysvetlím problém, cieľového používateľa a riešenie. Pointa: FORMeGO šetrí čas a znižuje frustráciu z opakovaného vypĺňania formulárov.');
}

async function slide3(p) {
  const slideNo = 3;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Výsledok dotazníku', 'Validácia záujmu o produkt', 'Dotazník naznačil, že problém je reálny a ľudia by takéto rozšírenie chceli používať.');

  addPanel(slide, slideNo, { left: 72, top: 224, width: 560, height: 406 }, 'survey panel');
  await addImage(slide, slideNo, IMG.survey, { left: 88, top: 240, width: 528, height: 374 }, { role: 'survey screenshot', fit: 'cover' });

  addPanel(slide, slideNo, { left: 666, top: 224, width: 542, height: 406 }, 'metrics panel');
  addText(slide, slideNo, '7 odpovedí', { left: 700, top: 252, width: 150, height: 26 }, {
    fontSize: 15,
    color: COLOR.mint,
    bold: true,
    typeface: FONT.mono,
    autoFit: null,
    role: 'small stat',
  });

  const metrics = [
    { x: 700, y: 300, value: '100 %', label: 'považuje nápad za dobrý' },
    { x: 956, y: 300, value: '100 %', label: 'by chcelo takúto custom extension' },
    { x: 700, y: 466, value: '57,1 %', label: 'doteraz nepoužilo podobnú alternatívu' },
    { x: 956, y: 466, value: '42,9 %', label: 'už pozná alebo používa podobný spôsob' },
  ];

  for (const metric of metrics) {
    addPanel(slide, slideNo, { left: metric.x, top: metric.y, width: 224, height: 132 }, `metric ${metric.label}`, COLOR.accent);
    addText(slide, slideNo, metric.value, { left: metric.x + 18, top: metric.y + 16, width: 188, height: 42 }, {
      fontSize: 34,
      bold: true,
      typeface: FONT.title,
      role: 'metric value',
    });
    addText(slide, slideNo, metric.label, { left: metric.x + 18, top: metric.y + 66, width: 188, height: 44 }, {
      fontSize: 16,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'metric label',
    });
  }

  addText(slide, slideNo, 'Záver: produkt má jasný use-case a nízky prah pochopenia. Ľudia presne vedia, na čo by ho použili.', { left: 72, top: 648, width: 1134, height: 28 }, {
    fontSize: 16,
    color: COLOR.textSoft,
    typeface: FONT.body,
    role: 'footer insight',
    autoFit: null,
  });

  slide.speakerNotes.setText('Výsledky dotazníka: 100 % respondentov označilo nápad za dobrý a 100 % by chcelo takúto extension. Zároveň 57,1 % doteraz nemalo podobnú alternatívu, čo potvrdzuje priestor na jednoduché riešenie.');
}

async function slide4(p) {
  const slideNo = 4;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'MVP', 'Čo tvorí jadro produktu', 'Fokus bol na funkciách, ktoré dávajú používateľovi okamžitú hodnotu už v prvej verzii.');

  addPanel(slide, slideNo, { left: 72, top: 220, width: 554, height: 426 }, 'done column', COLOR.mint);
  addText(slide, slideNo, 'Hotové jadro MVP', { left: 100, top: 252, width: 240, height: 34 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.title,
    role: 'column title',
  });
  const done = [
    'vytvorenie, úprava a odstránenie profilu',
    'zoznam profilov v options stránke',
    'výber profilu priamo pri formulári',
    'rozpoznávanie polí formulára',
    'podpora firemných údajov a viacerých kontaktov',
    'poznámka k profilu a šifrovaný vault',
  ];
  done.forEach((item, idx) => {
    addShape(slide, slideNo, 'ellipse', { left: 102, top: 308 + idx * 50, width: 18, height: 18 }, COLOR.mint, '#00000000', 0, 'bullet');
    addText(slide, slideNo, item, { left: 134, top: 300 + idx * 50, width: 448, height: 30 }, {
      fontSize: 18,
      color: COLOR.text,
      typeface: FONT.body,
      role: 'done item',
    });
  });
  addPill(slide, slideNo, '8 / 10 user stories = Done', { left: 100, top: 572, width: 220, height: 40 }, '#17394C', COLOR.text);

  addPanel(slide, slideNo, { left: 654, top: 220, width: 554, height: 426 }, 'next column', COLOR.gold);
  addText(slide, slideNo, 'Ďalší krok po MVP', { left: 682, top: 252, width: 250, height: 34 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.title,
    role: 'column title',
  });
  const next = [
    'vybrať len konkrétnu informáciu namiesto celého formulára',
    'zobraziť vopred, čo sa presne vyplní',
    'ďalšie bezpečnostné vrstvy pri citlivých údajoch',
    'rozšírenie heuristík pre komplikované formuláre',
  ];
  next.forEach((item, idx) => {
    addShape(slide, slideNo, 'roundRect', { left: 684, top: 304 + idx * 72, width: 486, height: 52 }, '#12253D', COLOR.line, 1, 'next item');
    addText(slide, slideNo, item, { left: 706, top: 317 + idx * 72, width: 442, height: 24 }, {
      fontSize: 17,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'next item text',
      autoFit: null,
    });
  });

  slide.speakerNotes.setText('MVP je postavené na tom, aby používateľ vedel vytvoriť profil, vybrať ho pri formulári a jedným klikom doplniť údaje. Väčšina user stories je hotová, zvyšok sú skôr UX rozšírenia.');
}

async function slide5(p) {
  const slideNo = 5;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Tunel', 'Od prezentačnej stránky po stiahnutie', 'Cieľom je, aby používateľ vedel pochopiť produkt, dostať sa k repozitáru a spustiť rozšírenie bez chaosu.');

  const steps = [
    { x: 78, title: '1. GitHub Pages', body: 'Pútavá prezentačná stránka vysvetlí hodnotu produktu, funkcie aj inštaláciu.', image: null },
    { x: 372, title: '2. Stiahnuť ZIP', body: 'CTA vedie na repozitár alebo priamo na ZIP balík projektu.', image: null },
    { x: 666, title: '3. Load unpacked', body: 'Používateľ otvorí chrome://extensions a načíta priečinok autofill-profiles.', image: IMG.shot4 },
    { x: 960, title: '4. Rozšírenie pripravené', body: 'Po focusnutí formulára sa zobrazí popover a profil vie doplniť údaje.', image: IMG.shot2 },
  ];

  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    addPanel(slide, slideNo, { left: step.x, top: 246, width: 244, height: 364 }, `step ${i + 1}`, COLOR.accent);
    addText(slide, slideNo, step.title, { left: step.x + 18, top: 268, width: 204, height: 28 }, {
      fontSize: 18,
      bold: true,
      typeface: FONT.title,
      role: 'step title',
    });
    addShape(slide, slideNo, 'roundRect', { left: step.x + 16, top: 310, width: 212, height: 160 }, '#0B1220', COLOR.line, 1, 'step image frame');
    if (i === 0) {
      addShape(slide, slideNo, 'roundRect', { left: step.x + 24, top: 322, width: 196, height: 136 }, '#F7FBFF', '#00000000', 0, 'browser mock');
      addShape(slide, slideNo, 'rect', { left: step.x + 24, top: 322, width: 196, height: 20 }, '#E5EEF9', '#00000000', 0, 'browser topbar');
      addShape(slide, slideNo, 'ellipse', { left: step.x + 34, top: 328, width: 8, height: 8 }, '#FF8B88', '#00000000', 0, 'browser dot');
      addShape(slide, slideNo, 'ellipse', { left: step.x + 48, top: 328, width: 8, height: 8 }, '#FFD166', '#00000000', 0, 'browser dot');
      addShape(slide, slideNo, 'ellipse', { left: step.x + 62, top: 328, width: 8, height: 8 }, '#7FE0BE', '#00000000', 0, 'browser dot');
      await addImage(slide, slideNo, IMG.logoWordmark, { left: step.x + 40, top: 352, width: 122, height: 30 }, { role: 'step image', fit: 'contain' });
      addText(slide, slideNo, 'Automatické vypĺňanie formulárov', { left: step.x + 38, top: 390, width: 148, height: 26 }, {
        fontSize: 13,
        color: COLOR.dark,
        bold: true,
        typeface: FONT.body,
        role: 'browser mock title',
      });
      addText(slide, slideNo, 'funkcie • screenshoty • návod', { left: step.x + 38, top: 420, width: 144, height: 18 }, {
        fontSize: 11,
        color: '#42566F',
        typeface: FONT.body,
        role: 'browser mock text',
        autoFit: null,
      });
      addShape(slide, slideNo, 'roundRect', { left: step.x + 152, top: 386, width: 48, height: 48 }, '#57A8FF', '#00000000', 0, 'browser cta');
      addText(slide, slideNo, 'ZIP', { left: step.x + 160, top: 399, width: 32, height: 18 }, {
        fontSize: 12,
        color: '#FFFFFF',
        bold: true,
        align: 'center',
        typeface: FONT.mono,
        role: 'browser cta text',
        autoFit: null,
      });
    } else if (i === 1) {
      addShape(slide, slideNo, 'roundRect', { left: step.x + 48, top: 334, width: 86, height: 108 }, '#F5F9FF', '#D8E5F5', 1, 'zip file');
      addShape(slide, slideNo, 'rect', { left: step.x + 48, top: 334, width: 86, height: 22 }, '#DDEBFF', '#00000000', 0, 'zip file top');
      addText(slide, slideNo, '.zip', { left: step.x + 68, top: 372, width: 46, height: 24 }, {
        fontSize: 18,
        color: COLOR.dark,
        bold: true,
        align: 'center',
        typeface: FONT.mono,
        role: 'zip label',
      });
      addText(slide, slideNo, 'FORMeGO', { left: step.x + 58, top: 404, width: 66, height: 20 }, {
        fontSize: 11,
        color: '#48617D',
        bold: true,
        align: 'center',
        typeface: FONT.body,
        role: 'zip text',
        autoFit: null,
      });
      addShape(slide, slideNo, 'ellipse', { left: step.x + 152, top: 358, width: 46, height: 46 }, COLOR.accent, '#00000000', 0, 'download circle');
      addText(slide, slideNo, '↓', { left: step.x + 160, top: 364, width: 30, height: 28 }, {
        fontSize: 24,
        color: '#FFFFFF',
        bold: true,
        align: 'center',
        typeface: FONT.body,
        role: 'download arrow',
        autoFit: null,
      });
      addText(slide, slideNo, 'Repo → ZIP → stiahnuť', { left: step.x + 34, top: 444, width: 170, height: 16 }, {
        fontSize: 11,
        color: COLOR.textSoft,
        align: 'center',
        typeface: FONT.body,
        role: 'download flow',
        autoFit: null,
      });
    } else {
      await addImage(slide, slideNo, step.image, { left: step.x + 24, top: 318, width: 196, height: 144 }, {
        role: 'step image',
        fit: 'cover',
      });
    }
    addText(slide, slideNo, step.body, { left: step.x + 18, top: 494, width: 204, height: 90 }, {
      fontSize: 16,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'step body',
    });
    if (i < steps.length - 1) {
      addArrow(slide, slideNo, step.x + 244, 410, 46);
    }
  }

  slide.speakerNotes.setText('Tunel ukazuje cestu používateľa: od prezentačnej stránky cez stiahnutie ZIP balíka až po reálne spustenie rozšírenia cez Load unpacked.');
}

async function slide6(p) {
  const slideNo = 6;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Demo aplikácie', 'Ako FORMeGO vyzerá v praxi', 'Rozšírenie stojí na dvoch pilieroch: správa profilov a rýchly výber pri formulári.');

  addPanel(slide, slideNo, { left: 72, top: 224, width: 654, height: 402 }, 'main demo', COLOR.accent);
  addText(slide, slideNo, 'Options stránka a editor profilov', { left: 96, top: 248, width: 300, height: 28 }, {
    fontSize: 20,
    bold: true,
    typeface: FONT.title,
    role: 'demo title',
  });
  addShape(slide, slideNo, 'roundRect', { left: 96, top: 290, width: 606, height: 304 }, '#0A1322', COLOR.line, 1, 'main demo frame');
  await addImage(slide, slideNo, IMG.shot1, { left: 108, top: 302, width: 582, height: 280 }, { role: 'main demo image', fit: 'cover' });

  const mini = [
    { y: 224, title: 'Vault unlock', body: 'Citlivé údaje sú chránené a profilový vault sa odomyká heslom.', image: IMG.shot2 },
    { y: 362, title: 'Editor sekcií', body: 'Používateľ dopĺňa identitu, kontakt, adresu aj ďalšie údaje.', image: IMG.shot3 },
    { y: 500, title: 'Zoznam profilov', body: 'Výber kont typu Ja, sestra, tato alebo pracovný profil.', image: IMG.shot5 },
  ];

  for (const item of mini) {
    addPanel(slide, slideNo, { left: 754, top: item.y, width: 454, height: 126 }, `mini ${item.title}`, COLOR.mint);
    addShape(slide, slideNo, 'roundRect', { left: 774, top: item.y + 16, width: 122, height: 94 }, '#0A1322', COLOR.line, 1, 'mini frame');
    await addImage(slide, slideNo, item.image, { left: 782, top: item.y + 24, width: 106, height: 78 }, { role: 'mini demo image', fit: 'cover' });
    addText(slide, slideNo, item.title, { left: 918, top: item.y + 18, width: 244, height: 24 }, {
      fontSize: 18,
      bold: true,
      typeface: FONT.title,
      role: 'mini title',
    });
    addText(slide, slideNo, item.body, { left: 918, top: item.y + 50, width: 252, height: 48 }, {
      fontSize: 15,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'mini body',
    });
  }

  slide.speakerNotes.setText('Tu ukážem samotnú aplikáciu: options page, odomykanie šifrovaného vaultu, editor profilov a výber konkrétneho konta pri formulári.');
}

async function slide7(p) {
  const slideNo = 7;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Technické záležitosti', 'Ako je produkt postavený', 'Technológie sú jednoduché, ale riešia presne to, čo produkt potrebuje: UI, heuristiku, storage a bezpečnosť.');

  addPanel(slide, slideNo, { left: 72, top: 230, width: 1136, height: 380 }, 'architecture shell');

  const boxes = [
    { left: 100, top: 286, width: 218, height: 138, title: 'Manifest V3', body: 'Chrome/Edge extension so správnym life-cyclom a host permissions.', accent: COLOR.accent },
    { left: 372, top: 286, width: 240, height: 138, title: 'Content script', body: 'Sleduje focus formulárov, zobrazuje popover a mapuje polia heuristikou.', accent: COLOR.mint },
    { left: 666, top: 286, width: 240, height: 138, title: 'Options page', body: 'Editor profilov, sekcie údajov, dark UI a správa vaultu.', accent: COLOR.gold },
    { left: 960, top: 286, width: 218, height: 138, title: 'Background + storage', body: 'Šifrovaný vault, messaging a práca s chrome.storage.', accent: COLOR.coral },
  ];

  for (const box of boxes) {
    addPanel(slide, slideNo, box, box.title, box.accent);
    addText(slide, slideNo, box.title, { left: box.left + 18, top: box.top + 18, width: box.width - 36, height: 28 }, {
      fontSize: 20,
      bold: true,
      typeface: FONT.title,
      role: 'arch title',
    });
    addText(slide, slideNo, box.body, { left: box.left + 18, top: box.top + 56, width: box.width - 36, height: 58 }, {
      fontSize: 16,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'arch body',
    });
  }

  addArrow(slide, slideNo, 320, 340, 42);
  addArrow(slide, slideNo, 614, 340, 42);
  addArrow(slide, slideNo, 908, 340, 42);

  const pills = ['HTML + CSS + JavaScript', 'chrome.storage.sync', 'React/Vue compatible events', 'heuristické mapovanie polí', 'AES-GCM vault'];
  pills.forEach((pill, idx) => {
    addPill(slide, slideNo, pill, { left: 100 + idx * 216, top: 520, width: 198, height: 38 }, '#12253D', COLOR.text);
  });

  slide.speakerNotes.setText('Technická vrstva stojí na Manifest V3, content scripte, options page a background workeri. Dôležitá časť je heuristické mapovanie polí a bezpečnosť cez šifrovaný vault.');
}

async function slide8(p) {
  const slideNo = 8;
  const slide = p.slides.add();
  addBg(slide, slideNo);
  addSectionTitle(slide, slideNo, 'Spätná väzba', 'Zdroj, feedback, odpoveď, ponaučenie', 'Feedback neslúžil len na potvrdenie nápadu, ale aj na zúženie rozsahu a lepšie prioritizovanie.');

  const data = [
    {
      x: 72,
      title: 'Zdroj',
      body: 'Dotazník medzi používateľmi + porovnanie riešení ako AutoFill Forms, Bitwarden a LastPass.',
      accent: COLOR.accent,
    },
    {
      x: 366,
      title: 'Feedback',
      body: 'Ľudia chceli hlavne rýchlosť, viac profilov, firemné údaje a minimum klikov. Zaznel aj nápad na templaty adries.',
      accent: COLOR.mint,
    },
    {
      x: 660,
      title: 'Odpoveď',
      body: 'Produkt som rozšíril o širší dátový model, celý formulár na jeden klik a bezpečnostný hardening citlivých údajov.',
      accent: COLOR.gold,
    },
    {
      x: 954,
      title: 'Ponaučenie',
      body: 'Najväčšiu hodnotu netvorí množstvo funkcií, ale jasný flow: fokus na pole, výber profilu, hotovo.',
      accent: COLOR.coral,
    },
  ];

  for (const item of data) {
    addPanel(slide, slideNo, { left: item.x, top: 258, width: 254, height: 314 }, `feedback ${item.title}`, item.accent);
    addText(slide, slideNo, item.title, { left: item.x + 18, top: 286, width: 180, height: 30 }, {
      fontSize: 22,
      bold: true,
      typeface: FONT.title,
      role: 'feedback title',
    });
    addText(slide, slideNo, item.body, { left: item.x + 18, top: 336, width: 214, height: 188 }, {
      fontSize: 17,
      color: COLOR.textSoft,
      typeface: FONT.body,
      role: 'feedback body',
    });
  }

  addText(slide, slideNo, 'Benchmark + survey = potvrdenie, že jednoduché autofill riešenie má zmysel, ak je rýchle a dôveryhodné.', { left: 72, top: 618, width: 1138, height: 26 }, {
    fontSize: 17,
    color: COLOR.textSoft,
    typeface: FONT.body,
    role: 'feedback footer',
    autoFit: null,
  });

  slide.speakerNotes.setText('Na tomto slide uzatváram validáciu. Feedback ukázal, že správna priorita nie je komplikované UI, ale rýchly one-click flow a dôvera pri práci s údajmi.');
}

async function slide9(p) {
  const slideNo = 9;
  const slide = p.slides.add();
  addBg(slide, slideNo);

  addShape(slide, slideNo, 'roundRect', { left: 54, top: 54, width: 1172, height: 612 }, '#0F1B2DED', COLOR.line, 1.4, 'cta shell');
  addText(slide, slideNo, 'Vyskúšaj FORMeGO', { left: 620, top: 118, width: 460, height: 62 }, {
    fontSize: 42,
    bold: true,
    typeface: FONT.title,
    role: 'cta title',
  });
  addText(slide, slideNo, 'Naskenuj QR kód a otvor GitHub Pages prezentáciu alebo repozitár so zdrojovým kódom.', { left: 622, top: 188, width: 488, height: 74 }, {
    fontSize: 21,
    color: COLOR.textSoft,
    typeface: FONT.body,
    role: 'cta subtitle',
  });

  addPanel(slide, slideNo, { left: 100, top: 116, width: 420, height: 420 }, 'qr panel', COLOR.accent);
  addShape(slide, slideNo, 'roundRect', { left: 148, top: 160, width: 324, height: 324 }, '#FFFFFF', '#00000000', 0, 'qr surface');
  await addImage(slide, slideNo, IMG.qr, { left: 172, top: 184, width: 276, height: 276 }, { role: 'qr image', fit: 'contain' });
  addText(slide, slideNo, 'GitHub Pages', { left: 100, top: 556, width: 420, height: 28 }, {
    fontSize: 18,
    color: COLOR.mint,
    bold: true,
    align: 'center',
    typeface: FONT.mono,
    autoFit: null,
    role: 'qr caption',
  });

  addPanel(slide, slideNo, { left: 620, top: 304, width: 510, height: 88 }, 'url panel', COLOR.mint);
  addText(slide, slideNo, 'simoncalik.github.io/FORMeGO', { left: 646, top: 334, width: 460, height: 26 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.body,
    role: 'cta url',
  });

  addPanel(slide, slideNo, { left: 620, top: 416, width: 510, height: 88 }, 'repo panel', COLOR.accent);
  addText(slide, slideNo, 'github.com/SimonCalik/FORMeGO', { left: 646, top: 446, width: 460, height: 26 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.body,
    role: 'cta repo',
  });

  addPill(slide, slideNo, 'GitHub Pages', { left: 620, top: 542, width: 146, height: 38 }, '#17314F', COLOR.text);
  addPill(slide, slideNo, 'ZIP download', { left: 780, top: 542, width: 150, height: 38 }, '#153842', COLOR.text);
  addPill(slide, slideNo, 'Load unpacked', { left: 944, top: 542, width: 166, height: 38 }, '#1B3243', COLOR.text);

  slide.speakerNotes.setText('Záver prezentácie: publikum môže hneď otvoriť GitHub Pages stránku, pozrieť si produkt a stiahnuť si projekt.');
}

async function buildDeck() {
  await ensureDirs();
  const p = Presentation.create({ slideSize: { width: W, height: H } });
  await slide1(p);
  await slide2(p);
  await slide3(p);
  await slide4(p);
  await slide5(p);
  await slide6(p);
  await slide7(p);
  await slide8(p);
  await slide9(p);
  return p;
}

async function saveBlobToFile(blob, filePath) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(filePath, bytes);
}

async function exportDeck(presentation) {
  await fs.writeFile(INSPECT_PATH, inspect.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  for (let i = 0; i < presentation.slides.items.length; i += 1) {
    const preview = await presentation.export({ slide: presentation.slides.items[i], format: 'png', scale: 1 });
    await saveBlobToFile(preview, path.join(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`));
  }
  const pptx = await PresentationFile.exportPptx(presentation);
  const outPath = path.join(OUT_DIR, 'output.pptx');
  await pptx.save(outPath);
  console.log(outPath);
}

const deck = await buildDeck();
await exportDeck(deck);
