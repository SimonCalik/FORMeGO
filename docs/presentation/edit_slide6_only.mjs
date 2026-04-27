import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const ROOT = path.resolve('C:/Users/simon/Desktop/Projektový manažment/Profile_autofiller');
const PPTX_PATH = path.join(ROOT, 'docs', 'FORMeGO-prezentacia.pptx');
const PPTX_OUT_PATH = path.join(ROOT, 'docs', 'FORMeGO-prezentacia-slide6-upravena.pptx');
const SCRATCH = path.join(ROOT, 'tmp', 'slides', 'formego-slide6-edit');
const PREVIEW = path.join(SCRATCH, 'preview');

const W = 1280;
const H = 720;

const COLOR = {
  bg: '#08111F',
  panelGlass: '#102038E8',
  line: '#84ABE72E',
  text: '#EDF5FF',
  textSoft: '#ABC0DE',
  accent: '#57A8FF',
  mint: '#7FE0BE',
};

const FONT = {
  title: 'Georgia',
  body: 'Trebuchet MS',
  mono: 'Consolas',
};

const IMG = {
  shot1: path.join(ROOT, 'docs', 'assets', 'shot-1.png'),
  shot2: path.join(ROOT, 'docs', 'assets', 'shot-2.png'),
  shot3: path.join(ROOT, 'docs', 'assets', 'shot-3.png'),
  shot5: path.join(ROOT, 'docs', 'assets', 'shot-5.png'),
};

async function readImageBlob(imagePath) {
  const bytes = await fs.readFile(imagePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function line(fill = '#00000000', width = 0) {
  return { style: 'solid', fill, width };
}

function addShape(slide, geometry, position, fill, stroke = '#00000000', strokeWidth = 0) {
  return slide.shapes.add({ geometry, position, fill, line: line(stroke, strokeWidth) });
}

function addText(slide, text, position, options = {}) {
  const shape = addShape(
    slide,
    options.geometry || 'rect',
    position,
    options.fill || '#00000000',
    options.stroke || '#00000000',
    options.strokeWidth || 0,
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
  return shape;
}

async function addImage(slide, imagePath, position, options = {}) {
  const image = slide.images.add({
    blob: await readImageBlob(imagePath),
    fit: options.fit || 'cover',
    alt: options.alt || path.basename(imagePath),
  });
  image.position = position;
  if (options.crop) image.crop = options.crop;
  return image;
}

function addBg(slide) {
  slide.background.fill = COLOR.bg;
  addShape(slide, 'ellipse', { left: -80, top: -120, width: 420, height: 420 }, '#57A8FF24');
  addShape(slide, 'ellipse', { left: 960, top: -110, width: 360, height: 360 }, '#7FE0BE1A');
  addShape(slide, 'ellipse', { left: 860, top: 500, width: 340, height: 220 }, '#57A8FF14');
}

function addSectionTitle(slide) {
  addText(slide, 'DEMO APLIKÁCIE', { left: 72, top: 42, width: 260, height: 22 }, {
    fontSize: 13,
    color: COLOR.mint,
    bold: true,
    typeface: FONT.mono,
    autoFit: null,
  });
  addText(slide, 'Ako FORMeGO vyzerá v praxi', { left: 72, top: 74, width: 780, height: 76 }, {
    fontSize: 40,
    color: COLOR.text,
    bold: true,
    typeface: FONT.title,
  });
  addText(slide, 'Rozšírenie stojí na dvoch pilieroch: správa profilov a rýchly výber pri formulári.', { left: 74, top: 158, width: 860, height: 34 }, {
    fontSize: 20,
    color: COLOR.textSoft,
    typeface: FONT.body,
    autoFit: null,
  });
}

function addPanel(slide, position, accent = null) {
  addShape(slide, 'roundRect', position, COLOR.panelGlass, COLOR.line, 1.2);
  if (accent) {
    addShape(slide, 'rect', { left: position.left, top: position.top, width: 8, height: position.height }, accent);
  }
}

async function rebuildSlide6(slide) {
  addBg(slide);
  addSectionTitle(slide);

  addPanel(slide, { left: 72, top: 224, width: 770, height: 420 }, COLOR.accent);
  addText(slide, 'Options stránka a editor profilov', { left: 98, top: 250, width: 360, height: 34 }, {
    fontSize: 24,
    bold: true,
    typeface: FONT.title,
  });
  addShape(slide, 'roundRect', { left: 96, top: 300, width: 720, height: 310 }, '#0A1322', COLOR.line, 1);
  await addImage(slide, IMG.shot1, { left: 108, top: 312, width: 696, height: 286 }, { fit: 'cover' });

  addPanel(slide, { left: 870, top: 224, width: 338, height: 182 }, COLOR.mint);
  addShape(slide, 'roundRect', { left: 890, top: 246, width: 126, height: 126 }, '#0A1322', COLOR.line, 1);
  await addImage(slide, IMG.shot2, { left: 900, top: 256, width: 106, height: 106 }, { fit: 'cover' });
  addText(slide, 'Vault unlock', { left: 1036, top: 250, width: 140, height: 28 }, {
    fontSize: 22,
    bold: true,
    typeface: FONT.title,
  });
  addText(slide, 'Citlivé údaje sú chránené a profilový vault sa odomyká heslom.', { left: 1036, top: 292, width: 142, height: 72 }, {
    fontSize: 18,
    color: COLOR.textSoft,
    typeface: FONT.body,
  });

  addPanel(slide, { left: 870, top: 432, width: 338, height: 212 }, COLOR.mint);
  addShape(slide, 'roundRect', { left: 890, top: 454, width: 126, height: 76 }, '#0A1322', COLOR.line, 1);
  await addImage(slide, IMG.shot3, { left: 898, top: 462, width: 110, height: 60 }, { fit: 'cover' });
  addShape(slide, 'roundRect', { left: 890, top: 544, width: 126, height: 76 }, '#0A1322', COLOR.line, 1);
  await addImage(slide, IMG.shot5, { left: 898, top: 552, width: 110, height: 60 }, { fit: 'cover' });
  addText(slide, 'Editor sekcií a zoznam profilov', { left: 1036, top: 456, width: 146, height: 56 }, {
    fontSize: 22,
    bold: true,
    typeface: FONT.title,
  });
  addText(slide, 'Používateľ dopĺňa identitu, kontakt, adresu aj ďalšie údaje a vie sa rýchlo prepínať medzi kontami.', { left: 1036, top: 528, width: 148, height: 88 }, {
    fontSize: 18,
    color: COLOR.textSoft,
    typeface: FONT.body,
  });
}

async function main() {
  await fs.mkdir(PREVIEW, { recursive: true });
  const blob = await FileBlob.load(PPTX_PATH);
  const presentation = await PresentationFile.importPptx(blob);

  const slide5 = presentation.slides.getItem(4);
  const oldSlide6 = presentation.slides.getItem(5);
  const inserted = presentation.slides.insert({ after: slide5 });
  const newSlide6 = inserted.slide;

  await rebuildSlide6(newSlide6);
  oldSlide6.delete();

  const preview = await presentation.export({ slide: newSlide6, format: 'png', scale: 1 });
  const previewPath = path.join(PREVIEW, 'slide-06-updated.png');
  const previewBytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(previewPath, previewBytes);

  const out = await PresentationFile.exportPptx(presentation);
  await out.save(PPTX_OUT_PATH);

  console.log(previewPath);
  console.log(PPTX_OUT_PATH);
}

await main();
