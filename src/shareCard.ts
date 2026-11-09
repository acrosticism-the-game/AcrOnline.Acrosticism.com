import { DAILY_HASHTAGS, DAILY_SHARE_URL, SHARE_HANDLE } from "./dailyUtils";

// Builds the shareable image for a finished daily challenge: your background image
// with the challenge number, word, theme and the player's backronym drawn on top.

export type ShareCardInput = {
  number: number;
  theme: string;
  word: string;
  lines: string[];
  streak?: number;
};

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

// Background image, saved in the project's public folder.
const BACKGROUND_FILE = "share-background.png";

// Where the text goes, as fractions of the card (0 to 1).
// Keep the bottom of this box above the logo in the background image.
const TEXT_AREA = { x: 0.1, y: 0.17, w: 0.8, h: 0.57 };

// A white panel is drawn behind the text so it stays easy to read over the artwork.
const PANEL_PADDING = 40;
const PANEL_RADIUS = 44;
// How solid the panel is: 1 is fully white, lower lets more of the artwork show through.
const PANEL_OPACITY = 0.8;
// Outline around the panel. Set the width to 0 for no outline.
const PANEL_BORDER_WIDTH = 3;
const PANEL_BORDER_COLOR = "rgba(27, 31, 75, 0.5)";

// Font used on the card. It is loaded from Google Fonts when the card is made.
const CARD_FONT = "Fredoka";
const FONT_REGULAR = 400;
const FONT_BOLD = 600;
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&display=swap";
const FONT_LINK_ID = "acr-share-card-font";

// Colors
const INK = "#1b1f4b";
const ACCENT = "#d6249f";
const BLUE = "#1155cc";

// Small web address in the bottom left corner (set to false to hide it).
const SHOW_URL = true;

const fontString = (weight: number, size: number) =>
  `${weight} ${Math.round(size)}px "${CARD_FONT}", "Nunito", sans-serif`;

type DrawCommand = {
  text: string;
  font: string;
  color: string;
  x: number;
  y: number;
  center: boolean;
};

// Splits text into rows that fit the width. Very long words are broken up.
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const tokens: string[] = [];
  text
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      if (ctx.measureText(word).width <= maxWidth) {
        tokens.push(word);
        return;
      }
      let chunk = "";
      for (const ch of word) {
        if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
          tokens.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      if (chunk) tokens.push(chunk);
    });

  const rows: string[] = [];
  let current = "";
  tokens.forEach((token) => {
    const test = current ? `${current} ${token}` : token;
    if (!current || ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      rows.push(current);
      current = token;
    }
  });
  if (current) rows.push(current);
  return rows.length > 0 ? rows : [""];
};

// Shrinks a font size until the text fits on one row.
const fitSize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  size: number,
  maxWidth: number
) => {
  let s = size;
  ctx.font = fontString(weight, s);
  while (s > 20 && ctx.measureText(text).width > maxWidth) {
    s -= 4;
    ctx.font = fontString(weight, s);
  }
  return s;
};

const buildLayout = (
  ctx: CanvasRenderingContext2D,
  input: ShareCardInput,
  maxWidth: number,
  scale: number
) => {
  const commands: DrawCommand[] = [];
  let y = 0;
  let blockWidth = 0;

  const addCentered = (text: string, weight: number, size: number, color: string) => {
    const s = fitSize(ctx, text, weight, size, maxWidth);
    commands.push({
      text,
      font: fontString(weight, s),
      color,
      x: 0,
      y: y + s * 0.95,
      center: true,
    });
    y += s * 1.25;
  };

  addCentered("Acrosticize THIS!", FONT_BOLD, 58 * scale, ACCENT);
  const subtitle =
    input.streak && input.streak >= 2
      ? `Daily Challenge No. ${input.number}  ·  ${input.streak} day streak`
      : `Daily Challenge No. ${input.number}`;
  addCentered(subtitle, FONT_REGULAR, 34 * scale, INK);
  y += 22 * scale;

  const spacedWord = input.word.toUpperCase().split("").join(" ");
  addCentered(spacedWord, FONT_BOLD, 112 * scale, INK);
  y += 6 * scale;

  const themeSize = 44 * scale;
  ctx.font = fontString(FONT_REGULAR, themeSize);
  wrapText(ctx, `Theme: ${input.theme}`, maxWidth).forEach((row) => {
    commands.push({
      text: row,
      font: fontString(FONT_REGULAR, themeSize),
      color: BLUE,
      x: 0,
      y: y + themeSize * 0.95,
      center: true,
    });
    y += themeSize * 1.25;
  });
  y += 30 * scale;

  const lineSize = 52 * scale;
  const boldFont = fontString(FONT_BOLD, lineSize);
  const regularFont = fontString(FONT_REGULAR, lineSize);

  input.word
    .toUpperCase()
    .split("")
    .forEach((letter, i) => {
      const raw = (input.lines[i] || "").trim();
      const text = raw || `${letter}...`;
      const first = text.charAt(0);
      const rest = text.slice(1);

      ctx.font = boldFont;
      const letterWidth = ctx.measureText(first).width;
      ctx.font = regularFont;
      const rows = wrapText(ctx, rest, Math.max(40, maxWidth - letterWidth));

      rows.forEach((row, r) => {
        if (r === 0) {
          commands.push({
            text: first,
            font: boldFont,
            color: ACCENT,
            x: 0,
            y: y + lineSize * 0.95,
            center: false,
          });
        }
        commands.push({
          text: row,
          font: regularFont,
          color: INK,
          x: letterWidth,
          y: y + lineSize * 0.95,
          center: false,
        });
        blockWidth = Math.max(blockWidth, letterWidth + ctx.measureText(row).width);
        y += lineSize * 1.3;
      });
      y += lineSize * 0.08;
    });

  return { commands, height: y, blockWidth };
};

const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const roundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  roundedRectPath(ctx, x, y, w, h, r);
};

// Used when no background image is found: a starry sky with a white panel.
const drawFallbackBackground = (ctx: CanvasRenderingContext2D) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  gradient.addColorStop(0, "#0b1240");
  gradient.addColorStop(1, "#2a1458");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.3 + rand() * 0.7;
    ctx.beginPath();
    ctx.arc(rand() * CARD_WIDTH, rand() * CARD_HEIGHT, 1 + rand() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

// The white panel behind the text. It is see-through, so the shadow is only drawn
// outside the panel, not underneath it.
const drawTextPanel = (
  ctx: CanvasRenderingContext2D,
  area: { x: number; y: number; w: number; h: number }
) => {
  const x = area.x - PANEL_PADDING;
  const y = area.y - PANEL_PADDING;
  const w = area.w + PANEL_PADDING * 2;
  const h = area.h + PANEL_PADDING * 2;

  // Soft shadow outside the panel only
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  roundedRectPath(ctx, x, y, w, h, PANEL_RADIUS);
  ctx.clip("evenodd");
  ctx.shadowColor = "rgba(27, 31, 75, 0.3)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 10000;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#000000";
  roundedRect(ctx, x - 10000, y, w, h, PANEL_RADIUS);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = `rgba(255, 255, 255, ${PANEL_OPACITY})`;
  roundedRect(ctx, x, y, w, h, PANEL_RADIUS);
  ctx.fill();

  if (PANEL_BORDER_WIDTH > 0) {
    ctx.lineWidth = PANEL_BORDER_WIDTH;
    ctx.strokeStyle = PANEL_BORDER_COLOR;
    roundedRect(ctx, x, y, w, h, PANEL_RADIUS);
    ctx.stroke();
  }
};

// Draws the whole card. Works with any 2D canvas, so it can also be tested outside the browser.
export const drawShareCard = (
  ctx: CanvasRenderingContext2D,
  background: CanvasImageSource | null,
  input: ShareCardInput
) => {
  // Start from solid white so a see-through image never turns black when shared
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  if (background) {
    // Fill the card, trimming from the top and left if the image is not exactly 4:5
    const source = background as unknown as { width: number; height: number };
    const cover = Math.max(CARD_WIDTH / source.width, CARD_HEIGHT / source.height);
    const w = source.width * cover;
    const h = source.height * cover;
    ctx.drawImage(background, CARD_WIDTH - w, CARD_HEIGHT - h, w, h);
  } else {
    drawFallbackBackground(ctx);
  }

  const area = {
    x: TEXT_AREA.x * CARD_WIDTH,
    y: TEXT_AREA.y * CARD_HEIGHT,
    w: TEXT_AREA.w * CARD_WIDTH,
    h: TEXT_AREA.h * CARD_HEIGHT,
  };

  drawTextPanel(ctx, area);

  // Use the biggest text size that still fits inside the box
  let scale = 1;
  let layout = buildLayout(ctx, input, area.w, scale);
  while (layout.height > area.h && scale > 0.4) {
    scale -= 0.04;
    layout = buildLayout(ctx, input, area.w, scale);
  }

  const top = area.y + Math.max(0, (area.h - layout.height) / 2);
  const centerX = area.x + area.w / 2;
  const blockLeft = area.x + 40;

  ctx.textBaseline = "alphabetic";
  layout.commands.forEach((cmd) => {
    ctx.font = cmd.font;
    ctx.fillStyle = cmd.color;
    ctx.textAlign = cmd.center ? "center" : "left";
    ctx.fillText(cmd.text, cmd.center ? centerX : blockLeft + cmd.x, top + cmd.y);
  });

  if (SHOW_URL) {
    ctx.font = fontString(FONT_REGULAR, 30);
    ctx.textAlign = "left";
    const urlText = DAILY_SHARE_URL.replace(/^https?:\/\//, "");
    ctx.lineJoin = "round";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(urlText, CARD_WIDTH * 0.06, CARD_HEIGHT * 0.955);
    ctx.fillStyle = INK;
    ctx.fillText(urlText, CARD_WIDTH * 0.06, CARD_HEIGHT * 0.955);
  }
};

// Loads the card font from Google Fonts. If that fails, the fallback font is used.
const ensureCardFont = async () => {
  try {
    if (!document.getElementById(FONT_LINK_ID)) {
      await new Promise<void>((resolve) => {
        const link = document.createElement("link");
        link.id = FONT_LINK_ID;
        link.rel = "stylesheet";
        link.href = FONT_CSS_URL;
        link.onload = () => resolve();
        link.onerror = () => resolve();
        document.head.appendChild(link);
      });
    }
    await Promise.all([
      document.fonts.load(fontString(FONT_REGULAR, 40)),
      document.fonts.load(fontString(FONT_BOLD, 40)),
    ]);
  } catch { }
};

const loadBackground = (): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = `${process.env.PUBLIC_URL || ""}/${BACKGROUND_FILE}`;
  });

export const renderShareCard = async (input: ShareCardInput): Promise<Blob> => {
  await ensureCardFont();
  const background = await loadBackground();

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");

  drawShareCard(ctx, background, input);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image"))),
      "image/png"
    );
  });
};

export const cardFileName = (number: number) => `acrosticize-this-${number}.png`;

// The short caption that goes with the image when it is shared.


export const buildShareCaption = (number: number) =>
  `Acrosticize THIS! No. ${number}\nPlay today's challenge: ${DAILY_SHARE_URL}\n${SHARE_HANDLE} ${DAILY_HASHTAGS}`;

// True on phones and browsers that can share an image file straight to other apps.
export const canShareImageFiles = (): boolean => {
  try {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
      return false;
    }
    const probe = new File([""], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
