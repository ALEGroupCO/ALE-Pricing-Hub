// ==UserScript==
// @name         ALE Pricing Hub
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  ALE job pricing calculator — wraps, stickers, corflutes and more
// @author       ALE
// @match        *://*.aroflo.com/*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  // ─── CONSTANTS ───────────────────────────────────────────────────────────────
  const WRAP = {
    MATERIAL_RATE:  250,
    COLOUR_RATES:   { Standard: 150, Specialty: 180 },
    LABOUR_RATE_HR: 100,
    HOURS_PER_DAY:  7.6,
    SETUP_FEE:      200,
    CONTOUR_RATES:  { Simple: 0.05, Standard: 0.15, Complex: 0.30, Insane: 0.50 },
    LABOUR_DAYS:    [0.5, 1, 2, 3, 4, 5, 6, 7],
  };

  const STICKER = {
    PRINTER_WIDTH: 1490,
    TYPES: [
      { key: 'standard', label: 'Standard - AR4650 Vinyl + ARGLOSS',          rate: 195  },
      { key: 'promo',    label: 'Promo - ARPROMO Vinyl (No Laminate)',          rate: 135  },
      { key: 'hitack',   label: 'Premium - ARHITAC Vinyl + AV1460',            rate: 185  },
      { key: 'vehicle',  label: 'Vehicle Sticker - AV1105 Vinyl + AV1460',     rate: 225  },
      { key: 'other',    label: 'Other Stickers Printing Method',              rate: null },
    ],
    CONTOUR_RATES: { Simple: 0.05, Standard: 0.15, Complex: 0.30, Insane: 0.50 },
    MIN_TOTAL: 100,
    ROUND_TO:  5,
  };

  const CORFLUTE = {
    TYPES: [
      {
        key: 'compcut',
        label: 'Computer Cut Vinyl (1-2 Colours)',
        sizes: [
          { label: '600mm × 900mm',  rate: 65  },
          { label: '900mm × 1200mm', rate: 105 },
        ],
      },
      {
        key: 'digital',
        label: 'Digitally Printed Vinyl',
        sizes: [
          { label: '600mm × 900mm',   rate: 70  },
          { label: '900mm × 1200mm',  rate: 185 },
          { label: '1200mm × 1200mm', rate: 245 },
          { label: '1200mm × 2400mm', rate: 450 },
        ],
      },
      {
        key: 'uvdirect',
        label: 'UV Direct Corflutes',
        sizes: [
          {
            label: '600mm × 900mm',
            tiered: [
              { minQty: 10,  rate: 55.00 },
              { minQty: 25,  rate: 23.50 },
              { minQty: 50,  rate: 21.00 },
              { minQty: 100, rate: 20.50 },
              { minQty: 200, rate: 19.50 },
            ],
          },
          {
            label: '900mm × 1200mm',
            tiered: [
              { minQty: 10,  rate: 75.00 },
              { minQty: 25,  rate: 65.00 },
              { minQty: 50,  rate: 39.50 },
              { minQty: 100, rate: 37.00 },
              { minQty: 200, rate: 35.00 },
            ],
          },
        ],
      },
    ],
    MIN_TOTAL: 100,
    ROUND_TO:  5,
  };


  // ─── A-FRAMES & RETRACTABLES ─────────────────────────────────────────────────
  const AFRAME = {
    TYPES: [
      {
        key: 'aframe_single',
        label: 'A-Frame Single Sided',
        sizes: [
          { label: '600mm x 600mm',  rate: 175 },
          { label: '600mm x 900mm',  rate: 195 },
          { label: '900mm x 1200mm', rate: 385 },
        ],
      },
      {
        key: 'aframe_double',
        label: 'A-Frame Double Sided',
        sizes: [
          { label: '600mm x 600mm',  rate: 265 },
          { label: '600mm x 900mm',  rate: 295 },
          { label: '900mm x 1200mm', rate: 445 },
        ],
      },
      {
        key: 'insert_frame',
        label: 'Corflute Insert Frame',
        sizes: [
          { label: '600mm x 900mm (2 flutes incl.)', rate: 270 },
        ],
      },
      {
        key: 'retract_black',
        label: 'Premium Retractable Banner - Black',
        sizes: [
          {
            label: '2100mm x 850mm (incl. So Flat print)',
            tiered: [
              { minQty: 1, rate: 295 },
              { minQty: 2, rate: 275 },
              { minQty: 5, rate: 255 },
            ],
          },
        ],
      },
      {
        key: 'retract_silver',
        label: 'Premium Retractable Banner - Silver',
        sizes: [
          {
            label: '2100mm x 850mm (incl. So Flat print)',
            tiered: [
              { minQty: 1, rate: 295 },
              { minQty: 2, rate: 275 },
              { minQty: 5, rate: 255 },
            ],
          },
        ],
      },
    ],
  };


  // ─── MARQUEES ─────────────────────────────────────────────────────────────────
  const MARQUEE = {
    SIZES: {
      '3x3': {
        label: '3×3 Full Kit (Frame & printed canopy)',
        base: 1125,
        wallSingle:  170,
        wallDouble:  325,
        halfWall:    335,
      },
      '6x3': {
        label: '6×3 Full Kit (Frame & printed canopy)',
        base: 1865,
        wallSingle:  375,
        wallDouble:  550,
        halfWall:    335,
      },
    },
    QTY_DISCOUNTS: [
      { minQty: 10, pct: 0.15 },
      { minQty: 5,  pct: 0.10 },
      { minQty: 2,  pct: 0.05 },
    ],
  };


  // ─── FLAGS ────────────────────────────────────────────────────────────────────
  const FLAGS = {
    FEATHER: {
      small: { label: 'Small 2.5m', single: 245, double: 270 },
      large: { label: 'Large 3.5m', single: 325, double: 365 },
    },
    TEARDROP: {
      small: { label: 'Small 1.85m', single: 225, double: 255 },
      large: { label: 'Large 2.75m', single: 325, double: 355 },
    },
    HARDWARE_FEE: 70,
    HARDWARE_OPTIONS: [
      'Cross Base with bag',
      'Straight Wall Bracket',
      '30 deg Wall Bracket',
      'Hard Base with bag',
      'Car Tyre Base',
    ],
    PRINTED: {
      single: { label: 'Printed Flag — Single Sided', rate: 175 },
      double: { label: 'Printed Flag — Double Sided', rate: 210 },
    },
    QTY_DISCOUNTS: [
      { minQty: 10, discount: 25 },
      { minQty: 5,  discount: 15 },
      { minQty: 2,  discount: 10 },
    ],
  };


  // ─── MEDIA WALLS ─────────────────────────────────────────────────────────────
  const MEDIAWALLS = {
    SIZES: [
      { key: '3000ss', label: '3000mm × 2280mm — Single Sided', kitRate: 695, printRate: 495  },
      { key: '3000ds', label: '3000mm × 2280mm — Double Sided', kitRate: 775, printRate: 545  },
      { key: '6000ds', label: '6000mm × 2280mm — Double Sided', kitRate: 1365, printRate: null },
    ],
    FINISH: [
      { key: 'kit',   label: 'Full Kit (frame + print)' },
      { key: 'print', label: 'Print Only' },
    ],
  };

  // ─── TABLE COVERS ─────────────────────────────────────────────────────────────
  const TABLECOVERS = {
    SIZES: [
      { key: '4ft', label: '4 Foot', rate: 175 },
      { key: '6ft', label: '6 Foot', rate: 240 },
      { key: '8ft', label: '8 Foot', rate: 320 },
    ],
    STYLES: ['Fitted', 'Throw', 'Stretch'],
    REAR_OPTIONS: [
      { key: 'closed', label: 'Closed Back', surcharge: 0  },
      { key: 'open',   label: 'Open Back',   surcharge: 0  },
      { key: 'zipper', label: 'Zipper Back', surcharge: 40 },
    ],
  };


  // ─── STATIONERY ──────────────────────────────────────────────────────────────
  const STATIONERY_BUILTIN = {
    'DL Flyer':             { size: '99mm × 210mm',          qtys: { 100:115,300:185,500:200,1000:240,2000:290,3000:350 }, artMin:50, artMax:90  },
    'DL Roll Fold Brochure':{ size: '99mm × 210mm (Flat A4)',qtys: { 200:295,500:495,1000:550,2000:680 },                  artMin:90, artMax:180 },
    'Business Cards':       { size: '90mm × 54mm',           qtys: { 250:125,500:155,1000:190,2000:290 },                  artMin:50, artMax:90  },
    'Postcards':            { size: '110mm × 184mm',         qtys: { 250:195,500:215,1000:350 },                           artMin:50, artMax:90  },
    'A3 Flyers':            { size: '297mm × 420mm',         qtys: { 200:350,500:630,1000:845 },                           artMin:50, artMax:90  },
    'A4 Flyers':            { size: '297mm × 210mm',         qtys: { 200:215,500:390,1000:490 },                           artMin:50, artMax:90  },
    'A5 Flyers':            { size: '148mm × 210mm',         qtys: { 200:170,500:310,1000:420 },                           artMin:50, artMax:90  },
    'A6 Flyers':            { size: '148mm × 105mm',         qtys: { 200:170,500:220,1000:310 },                           artMin:50, artMax:90  },
    'Presentation Folder':  { size: 'A4 – 210mm × 297mm',qtys:{ 250:750,500:1200,1000:1600 },                        artMin:50, artMax:90  },
    'Fridge Magnets':       { size: '90mm × 55mm',           qtys: { 250:150,500:220,1000:300 },                           artMin:50, artMax:90  },
    'Drink Coasters':       { size: '95mm × 95mm',           qtys: { 1000:230,2000:280,3000:390 },                         artMin:50, artMax:90  },
  };
  function loadStatCustom() {
    try { return JSON.parse(GM_getValue('ale_stat_custom', '{}')) || {}; }
    catch(e) { return {}; }
  }
  function saveStatCustom(obj) {
    GM_setValue('ale_stat_custom', JSON.stringify(obj));
  }
  function statGetAll() { return Object.assign({}, STATIONERY_BUILTIN, loadStatCustom()); }


  // ─── STUBBY COOLERS ──────────────────────────────────────────────────────────
  const STUBBY = {
    TIERS: [
      { minQty: 10,   maxQty: 19,   rate: 9.25 },
      { minQty: 20,   maxQty: 49,   rate: 8.25 },
      { minQty: 50,   maxQty: 99,   rate: 7.25 },
      { minQty: 100,  maxQty: 249,  rate: 6.00 },
      { minQty: 250,  maxQty: 499,  rate: 5.50 },
      { minQty: 500,  maxQty: 999,  rate: 5.00 },
      { minQty: 1000, maxQty: 1999, rate: 4.75 },
      { minQty: 2000, maxQty: null, rate: 4.40 },
    ],
  };


  // ─── BAR MATS ────────────────────────────────────────────────────────────────
  const BARMATS = {
    TIERS: [
      { minQty: 1,  maxQty: 9,   rate: 37.90 },
      { minQty: 10, maxQty: 24,  rate: 34.50 },
      { minQty: 25, maxQty: 49,  rate: 29.50 },
      { minQty: 50, maxQty: 99,  rate: 26.75 },
      { minQty: 100, maxQty: null, rate: 23.75 },
    ],
  };

  const ACP = {
    TYPES: [
      { key: 'coloured', label: 'ACP Coloured Sheet', hasColour: true,
        sizes: [
          { label: '1220mm × 2440mm', rate: 225 },
          { label: '1500mm × 3050mm', rate: 295 },
        ]},
      { key: 'white', label: 'ACP White Sheet', hasColour: false,
        sizes: [
          { label: '1220mm × 2440mm', rate: 165 },
          { label: '1500mm × 3050mm', rate: 275 },
        ]},
      { key: 'alum2mm', label: '2mm Solid Aluminum Sheet', hasColour: false,
        sizes: [
          { label: '2400mm × 1200mm', rate: 345 },
          { label: '3000mm × 1500mm', rate: 445 },
        ]},
      { key: 'alum16mm', label: '1.6mm Solid Aluminum Sheet', hasColour: false,
        sizes: [
          { label: '2400mm × 1200mm', rate: 265 },
          { label: '3000mm × 1500mm', rate: 365 },
        ]},
      { key: 'digital', label: 'Digitally Printed ACP', hasColour: false,
        sizes: [
          { label: '600mm × 900mm',   rate: 135 },
          { label: '900mm × 1200mm',  rate: 250 },
          { label: '1200mm × 1200mm', rate: 310 },
          { label: '1220mm × 2440mm', rate: 575 },
          { label: '1500mm × 1500mm', rate: 420 },
          { label: '1500mm × 3050mm', rate: 785 },
        ]},
    ],
  };

  const FENCEMESH = {
    ROLLS: [
      { label: '1.6m × 50m — incl. eyelets @600mm', rate: 1495 },
      { label: '1.8m × 50m — incl. eyelets @600mm', rate: 1795 },
      { label: '1.6m × 25m — incl. eyelets @600mm', rate: 895  },
      { label: '1.8m × 25m — incl. eyelets @600mm', rate: 975  },
    ],
    PANELS: [
      { label: '1600mm × 2400mm', rate: 125 },
      { label: '1800mm × 2400mm', rate: 155 },
    ],
  };

  const BANNERS = {
    PRINT_RATE:     125,   // $/sqm base
    LAMINATE_RATE:  30,    // $/sqm extra
    EYELET_RATE:    1.50,  // per eyelet
    ROPE_RATE:      5,     // $/m
    ROPE_EXCESS:    40,    // flat excess for rope+eyelet
    KEDER_RATE:     5,     // $/m circumference
    KEDER_SAIL_RATE:14,    // $/m circumference (keder+sailtrack)
    TYPE_RATES: { standard: 0, blockout: 125, backlit: 185 },
    PRESETS: [
      { label: '1500 × 900mm — Rope & Eyelets',              w: 1500, h: 900,  mount: 'rope_eyelet', flatRate: 180  },
      { label: '2400 × 900mm — Rope & Eyelets',              w: 2400, h: 900,  mount: 'rope_eyelet', flatRate: 275  },
      { label: '2400 × 1200mm — Rope & Eyelets',             w: 2400, h: 1200, mount: 'rope_eyelet', flatRate: 325  },
      { label: '3000 × 1200mm — Rope & Eyelets',             w: 3000, h: 1200, mount: 'rope_eyelet', flatRate: 450  },
      { label: '3000 × 1500mm — Rope & Eyelets (Promo)',     w: 3000, h: 1500, mount: 'rope_eyelet', flatRate: 395  },
      { label: '6000 × 3000mm — Billboard, Keder+Sailtrack', w: 6000, h: 3000, mount: 'keder_sail',  flatRate: 1625 },
    ],
  };

  const MENU_ITEMS = [
    { id: 'acp',        label: 'ACP Signs' },
    { id: 'wrap',       label: 'Vehicle Wraps' },
    { id: 'building',   label: 'Building Signage' },
    { id: 'corflute',   label: 'Corflutes' },
    { id: 'stickers',   label: 'Stickers' },
    { id: 'aframe',     label: 'A-Frames & Retractables' },
    { id: 'flags',      label: 'Flags' },
    { id: 'marquees',   label: 'Marquees' },
    { id: 'mediawalls', label: 'Media Walls' },
    { id: 'tablecovers',label: 'Table Covers' },
    { id: 'stubby',     label: 'Stubby Coolers' },
    { id: 'barmats',    label: 'Bar Mats' },
    { id: 'stationery', label: 'Stationery' },
    { id: 'banners',    label: 'Banners' },
    { id: 'wideformat', label: 'Fence Mesh' },
  ];

  const ACTIVE_MODULES = ['acp','wrap','stickers','corflute','aframe','marquees','flags','mediawalls','tablecovers','stationery','stubby','barmats','wideformat','banners'];

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  GM_addStyle(`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

    #ale-hub-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 2147483646;
      width: 52px; height: 52px; border-radius: 14px;
      background: #DA0C0C; border: none; color: #fff; font-size: 22px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 18px rgba(218,12,12,0.45);
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      user-select: none;
    }
    #ale-hub-fab:hover { transform: scale(1.07) translateY(-2px); background: #bf0a0a; box-shadow: 0 8px 28px rgba(218,12,12,0.55); }
    #ale-hub-fab.open  { background: #bf0a0a; }

    #ale-hub-panel {
      position: fixed; bottom: 92px; right: 28px; z-index: 2147483645;
      width: 432px; background: #fff; border: 1px solid #e5e5e5; border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
      font-family: 'Poppins', sans-serif; color: #1a1a1a;
      display: none; transform-origin: bottom right;
      max-height: calc(100vh - 120px); overflow-y: auto;
    }
    #ale-hub-panel.visible { display: block; animation: ale-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    @keyframes ale-pop {
      from { opacity: 0; transform: scale(0.88) translateY(10px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }

    .ale-header {
      padding: 15px 18px 13px; border-bottom: 1px solid #f0f0f0;
      background: #fff; position: sticky; top: 0; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
    }
    .ale-header-left { display: flex; align-items: center; gap: 10px; }
    .ale-header h2 { margin: 0 0 1px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #DA0C0C; }
    .ale-header p  { margin: 0; font-size: 10px; color: #bbb; font-weight: 400; }

    .ale-close-btn {
      background: none; border: none; cursor: pointer; font-size: 18px;
      color: #ccc; line-height: 1; padding: 0 2px; font-family: 'Poppins', sans-serif;
      transition: color 0.15s; flex-shrink: 0;
    }
    .ale-close-btn:hover { color: #DA0C0C; }

    .ale-back-btn {
      background: #f5f5f5; border: 1.5px solid #e0e0e0; border-radius: 7px;
      cursor: pointer; width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; color: #888; flex-shrink: 0; line-height: 1;
      transition: border-color 0.15s, background 0.15s, color 0.15s;
    }
    .ale-back-btn:hover { border-color: #DA0C0C; background: #fff0f0; color: #DA0C0C; }

    /* ── MENU ── */
    .ale-menu-body { padding: 16px 18px 18px; }
    .ale-menu-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .ale-menu-tile {
      position: relative;
      background: #fafafa; border: 1.5px solid #ebebeb; border-radius: 10px;
      padding: 10px 26px 10px 10px; font-family: 'Poppins', sans-serif; font-size: 10.5px;
      font-weight: 600; color: #555; cursor: pointer; text-align: left;
      transition: border-color 0.15s, background 0.15s, color 0.15s, transform 0.12s; line-height: 1.3;
      min-height: 46px; display: flex; align-items: center; box-sizing: border-box;
    }
    .ale-menu-tile:hover { border-color: #DA0C0C; background: #fff5f5; color: #DA0C0C; transform: translateY(-1px); }
    .ale-menu-tile.ale-tile-inactive { opacity: 0.38; cursor: not-allowed; pointer-events: none; }
    .ale-tile-badge { display: inline-block; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; background: #DA0C0C; color: #fff; border-radius: 4px; padding: 1px 5px; margin-left: 5px; vertical-align: middle; }
    .ale-tile-badge.wip { background: #d0d0d0; color: #888; }
    .ale-tile-star {
      position: absolute; top: 6px; right: 7px;
      font-size: 13px; line-height: 1; cursor: pointer;
      color: #ddd; transition: color 0.2s;
      display: block; user-select: none;
    }
    .ale-tile-star:hover { color: #DA0C0C; }
    .ale-tile-star.starred { color: #DA0C0C; }

    /* ── SHARED FIELDS ── */
    .ale-body { padding: 15px 18px; display: flex; flex-direction: column; gap: 12px; }
    .ale-field label { display: block; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #999; margin-bottom: 5px; }
    .ale-select, .ale-input {
      width: 100%; background: #fafafa; border: 1.5px solid #ebebeb; border-radius: 9px;
      color: #1a1a1a; font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500;
      padding: 8px 30px 8px 11px; outline: none; box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      appearance: none; -webkit-appearance: none; cursor: pointer;
    }
    .ale-input { padding: 8px 11px; cursor: text; }
    .ale-select:focus, .ale-input:focus { border-color: #DA0C0C; box-shadow: 0 0 0 3px rgba(218,12,12,0.09); background: #fff; }
    .ale-select-wrap { position: relative; }
    .ale-select-wrap::after { content: '▾'; position: absolute; right: 11px; top: 50%; transform: translateY(-50%); color: #ccc; pointer-events: none; font-size: 12px; }

    .ale-input-wrap { position: relative; }
    .ale-input-wrap .ale-input { padding-right: 36px; }
    .ale-input-unit { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 600; color: #ccc; letter-spacing: 0.04em; pointer-events: none; }

    .ale-inline-row { display: flex; gap: 8px; align-items: center; }
    .ale-inline-row .ale-select-wrap { flex: 1; }
    .ale-inline-row .ale-input-wrap { width: 104px; flex-shrink: 0; }
    .ale-inline-row .ale-input { padding-right: 32px; font-size: 12px; }

    .ale-three-col { display: flex; gap: 8px; align-items: center; }
    .ale-three-col .ale-input-wrap { flex: 1; }
    .ale-three-col .ale-input { padding-right: 32px; }
    .ale-three-col-sep { font-size: 11px; color: #ccc; font-weight: 500; flex-shrink: 0; }

    .ale-hint    { font-size: 10px; color: #ccc; margin-top: 4px; }
    .ale-divider { height: 1px; background: #f2f2f2; margin: 1px 0; }

    /* ── RESULT ── */
    .ale-result { background: #fff5f5; border: 1.5px solid #ffd4d4; border-radius: 11px; padding: 12px 14px; }
    .ale-result-label { font-size: 9.5px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ccc; margin-bottom: 6px; }
    .ale-result-amount { font-size: 28px; font-weight: 700; color: #DA0C0C; letter-spacing: -0.02em; line-height: 1; margin-bottom: 6px; }
    .ale-result-breakdown { font-size: 10.5px; color: #888; line-height: 1.7; border-top: 1px dashed #f0c0c0; margin-top: 8px; padding-top: 8px; }
    .ale-result-breakdown span { display: flex; justify-content: space-between; }
    .ale-result-breakdown span b { color: #1a1a1a; font-weight: 600; }
    .ale-result-breakdown .ale-bd-total { border-top: 1px solid #ffd4d4; margin-top: 5px; padding-top: 5px; font-weight: 700; font-size: 11px; color: #DA0C0C; }

    .ale-result-clip {
      background: #f7f7f7; border: 1.5px dashed #e0e0e0; border-radius: 8px;
      padding: 9px 11px; font-size: 10.5px; color: #555; line-height: 1.65;
      white-space: pre; font-family: 'Poppins', sans-serif; margin-top: 8px; overflow-x: auto;
    }

    .ale-actions { display: flex; gap: 8px; margin-top: 10px; }
    .ale-copy-btn {
      flex: 1; background: #DA0C0C; border: none; border-radius: 9px; color: #fff;
      font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700;
      letter-spacing: 0.05em; text-transform: uppercase; padding: 10px 14px;
      cursor: pointer; box-shadow: 0 2px 10px rgba(218,12,12,0.3);
      transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
    }
    .ale-copy-btn:hover { background: #bf0a0a; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(218,12,12,0.4); }
    .ale-copy-btn:active { transform: scale(0.96); }
    .ale-copy-btn.copied { background: #16a34a; box-shadow: 0 2px 10px rgba(22,163,74,0.35); }

    /* ── ADD TO LIST BUTTON ── */
    .ale-add-btn {
      flex: 1; background: #fff; border: 1.5px solid #DA0C0C; border-radius: 9px; color: #DA0C0C;
      font-family: 'Poppins', sans-serif; font-size: 11px; font-weight: 700;
      letter-spacing: 0.05em; text-transform: uppercase; padding: 10px 14px;
      cursor: pointer; transition: background 0.15s, transform 0.12s;
    }
    .ale-add-btn:hover { background: #fff5f5; transform: translateY(-1px); }
    .ale-add-btn:active { transform: scale(0.96); }
    .ale-add-btn.added { background: #16a34a; border-color: #16a34a; color: #fff; }

    /* ── QUOTE FAB ── */
    #ale-quote-fab {
      position: fixed; bottom: 28px; right: 88px; z-index: 2147483646;
      width: 52px; height: 52px; border-radius: 14px;
      background: #8B0000; border: none; color: #fff;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 18px rgba(0,0,0,0.18);
      opacity: 0; pointer-events: none;
      transform: scale(0.7) translateX(20px);
      transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease;
      user-select: none;
    }
    #ale-quote-fab.visible {
      opacity: 1; pointer-events: auto; transform: scale(1) translateX(0);
    }
    #ale-quote-fab:hover { transform: scale(1.07) translateY(-2px); box-shadow: 0 8px 28px rgba(139,0,0,0.35); }
    #ale-quote-fab.open  { background: #6B0000; }
    #ale-quote-badge {
      position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px;
      background: #DA0C0C; color: #fff; border-radius: 9px; border: 2px solid #fff;
      font-size: 10px; font-weight: 700; display: none; align-items: center; justify-content: center;
      padding: 0 4px; box-sizing: border-box; font-family: 'Poppins', sans-serif;
    }

    /* ── QUOTE PANEL ── */
    #ale-quote-panel {
      position: fixed; bottom: 92px; right: 28px; z-index: 2147483645;
      width: 432px; background: #fff; border: 1px solid #e5e5e5; border-radius: 16px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
      font-family: 'Poppins', sans-serif; color: #1a1a1a;
      display: none; transform-origin: bottom right;
      max-height: calc(100vh - 120px); overflow-y: auto;
    }
    #ale-quote-panel.visible { display: block; animation: ale-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .ale-quote-item {
      padding: 11px 14px; border: 1.5px solid #ebebeb; border-radius: 10px;
      background: #fafafa; display: flex; flex-direction: column; gap: 5px;
    }
    .ale-quote-item-label { font-size: 11px; font-weight: 600; color: #1a1a1a; line-height: 1.35; }
    .ale-quote-item-total { font-size: 13px; font-weight: 700; color: #DA0C0C; }
    .ale-quote-item-actions { display: flex; gap: 6px; margin-top: 3px; align-items: center; }
    .ale-qi-btn {
      background: #f5f5f5; border: 1.5px solid #e0e0e0; border-radius: 7px;
      font-family: 'Poppins', sans-serif; font-size: 10px; font-weight: 600;
      color: #666; cursor: pointer; padding: 4px 9px;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    .ale-qi-btn:hover { border-color: #DA0C0C; color: #DA0C0C; background: #fff5f5; }
    .ale-qi-btn.danger:hover { border-color: #cc0000; color: #cc0000; background: #fff5f5; }
    .ale-qi-btn.update { border-color: #2563eb; color: #2563eb; background: #eff6ff; }
    .ale-qi-btn.update:hover { background: #dbeafe; }
    .ale-quote-empty { font-size: 11px; color: #ccc; font-style: italic; text-align: center; padding: 24px 0; }
    .ale-quote-total-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 18px; border-top: 1px solid #f0f0f0; background: #fff;
      position: sticky; bottom: 0;
    }
    .ale-quote-total-label { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.06em; }
    .ale-quote-total-amount { font-size: 20px; font-weight: 700; color: #DA0C0C; }

    .ale-no-result { font-size: 11px; color: #ccc; font-style: italic; text-align: center; padding: 6px 0; }
    .ale-menu-footer { padding: 9px 18px 13px; font-size: 9.5px; color: #ddd; text-align: center; border-top: 1px solid #f5f5f5; margin-top: 8px; }
    .ale-footer { padding: 9px 18px 13px; font-size: 9.5px; color: #ddd; text-align: center; border-top: 1px solid #f5f5f5; }

    .ale-artwork-row { display: flex; align-items: center; gap: 10px; }
    .ale-artwork-toggle { display: flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; flex-shrink: 0; }
    .ale-artwork-toggle input[type="checkbox"] {
      appearance: none; -webkit-appearance: none; width: 16px; height: 16px;
      border: 1.5px solid #ddd; border-radius: 5px; background: #fafafa; cursor: pointer;
      position: relative; top: 1px; transition: background 0.15s, border-color 0.15s; flex-shrink: 0;
    }
    .ale-artwork-toggle input[type="checkbox"]:checked { background: #DA0C0C; border-color: #DA0C0C; }
    .ale-artwork-toggle input[type="checkbox"]:checked::after { content: '✓'; position: absolute; top: -1px; left: 2px; font-size: 11px; color: #fff; font-weight: 700; }
    .ale-artwork-toggle span { font-size: 11px; font-weight: 600; color: #555; white-space: nowrap; letter-spacing: 0.02em; }
    .ale-artwork-input-wrap { flex: 1; position: relative; }
    .ale-artwork-input-wrap::before { content: '$'; position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #ccc; font-family: 'Poppins', sans-serif; font-size: 13px; pointer-events: none; }
    .ale-artwork-input-wrap .ale-input { padding-left: 22px; padding-right: 11px; }
  `);

  // ─── DOM ─────────────────────────────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'ale-hub-fab';
  fab.title = 'ALE Pricing Hub';
  fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>`;
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.id = 'ale-hub-panel';
  document.body.appendChild(panel);

  const quoteFab = document.createElement('button');
  quoteFab.id = 'ale-quote-fab';
  quoteFab.title = 'Quote List';
  quoteFab.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/></svg><span id="ale-quote-badge"></span>';
  document.body.appendChild(quoteFab);

  const quotePanel = document.createElement('div');
  quotePanel.id = 'ale-quote-panel';
  document.body.appendChild(quotePanel);

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  const gid = id => document.getElementById(id);

  function applyMinAndRound(val) {
    return Math.ceil(Math.max(val, 100) / 5) * 5;
  }

  function copyText(text) {
    try { GM_setClipboard(text); return; } catch(e) {}
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    });
  }

  function flashCopy(btnId) {
    const btn = gid(btnId);
    if (!btn) return;
    btn.textContent = '✓ Copied!'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy Line Item'; btn.classList.remove('copied'); }, 2000);
  }


  // ─── SCROLL WHEEL ON NUMBER INPUTS ───────────────────────────────────────
  panel.addEventListener('wheel', function(e) {
    const el = e.target;
    if (el.tagName !== 'INPUT' || el.type !== 'number') return;
    e.preventDefault();
    const step  = parseFloat(el.step)  || 1;
    const min   = el.min !== '' ? parseFloat(el.min)  : -Infinity;
    const max   = el.max !== '' ? parseFloat(el.max)  :  Infinity;
    const cur   = parseFloat(el.value) || 0;
    const delta = e.deltaY < 0 ? step : -step;
    const next  = Math.min(max, Math.max(min, cur + delta));
    el.value = Number.isInteger(step) ? String(Math.round(next)) : next.toFixed(2);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, { passive: false });

  function closePanel() {
    panel.classList.remove('visible');
    fab.classList.remove('open');
    quoteFab.classList.remove('visible');
  }
  function closeQuotePanel() {
    quotePanel.classList.remove('visible');
    quoteFab.classList.remove('open');
  }

  // ─── QUOTE STORAGE ────────────────────────────────────────────────────────
  function aleQuote() {
    try { return JSON.parse(GM_getValue('ale_quote','[]'))||[]; } catch(e){ return []; }
  }
  function aleSaveQuote(q) { GM_setValue('ale_quote', JSON.stringify(q)); }
  function aleQuoteKey(clipText) {
    // Stable key = first line of clipText (the item type/label)
    return (clipText||'').split('\n')[0].trim();
  }
  function updateQuoteBadge() {
    const q = aleQuote();
    const badge = gid('ale-quote-badge');
    if (!badge) return;
    if (q.length > 0) {
      badge.textContent = q.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── SHARED ACTION RENDERER ───────────────────────────────────────────────
  // Call this after setting wrap.innerHTML to wire both buttons.
  // copyBtnId: the id of the existing copy button already in the HTML
  // addBtnId:  the id of the Add to List button already in the HTML
  function wireActions(copyBtnId, addBtnId, clipText, total, label) {
    const copyBtn = gid(copyBtnId);
    const addBtn  = gid(addBtnId);
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        copyText(clipText);
        copyBtn.textContent = '\u2713 Copied!'; copyBtn.classList.add('copied');
        setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
      });
    }
    if (addBtn) {
      // Check if same key already exists
      const key   = aleQuoteKey(clipText);
      const q     = aleQuote();
      const match = q.find(i => aleQuoteKey(i.clipText) === key && i.clipText === clipText);
      if (match) {
        addBtn.textContent = 'Update Item';
        addBtn.classList.add('update');
      }
      addBtn.addEventListener('click', () => {
        const q2    = aleQuote();
        const idx   = q2.findIndex(i => aleQuoteKey(i.clipText) === key && i.clipText === clipText);
        if (idx !== -1) {
          q2[idx].total = total;
          q2[idx].label = label;
          aleSaveQuote(q2);
          addBtn.textContent = '\u2713 Updated!';
        } else {
          q2.push({ id: Date.now(), clipText, total, label });
          aleSaveQuote(q2);
          addBtn.textContent = '\u2713 Added!';
        }
        addBtn.classList.add('added');
        addBtn.classList.remove('update');
        updateQuoteBadge();
        setTimeout(() => {
          const inQ = aleQuote().find(i => i.clipText === clipText);
          addBtn.textContent = inQ ? 'Update Item' : 'Add to List';
          addBtn.classList.remove('added');
          if (inQ) addBtn.classList.add('update'); else addBtn.classList.remove('update');
        }, 2000);
      });
    }
  }

  // Helper: returns the actions HTML string with both buttons
  function actionsHTML(copyId, addId) {
    return '<div class="ale-actions">' +
      '<button class="ale-copy-btn" id="' + copyId + '">Copy</button>' +
      '<button class="ale-add-btn" id="' + addId + '">Add to List</button>' +
      '</div>';
  }

  function moduleHeader(title, subtitle) {
    return `
      <div class="ale-header">
        <div class="ale-header-left">
          <button class="ale-back-btn" id="ale-back">←</button>
          <div><h2>${title}</h2><p>${subtitle}</p></div>
        </div>
        <button class="ale-close-btn" id="ale-mod-close">✕</button>
      </div>`;
  }

  function wireHeader() {
    gid('ale-back').addEventListener('click', buildMenu);
    gid('ale-mod-close').addEventListener('click', closePanel);
  }

  // ─── FAVOURITES ──────────────────────────────────────────────────────────────
  function aleFavourites() {
    try { return JSON.parse(GM_getValue('ale_favourites', '[]')) || []; }
    catch(e) { return []; }
  }
  function aleToggleFavourite(id) {
    const favs = aleFavourites();
    const idx  = favs.indexOf(id);
    if (idx === -1) favs.push(id);
    else favs.splice(idx, 1);
    GM_setValue('ale_favourites', JSON.stringify(favs));
  }

  // ─── MENU ────────────────────────────────────────────────────────────────────
  function buildMenu() {
    const favs   = aleFavourites();
    const sorted = [
      ...favs.filter(id => MENU_ITEMS.find(m => m.id === id)),
      ...MENU_ITEMS.filter(m => !favs.includes(m.id)).map(m => m.id),
    ];
    const tilesHTML = sorted.map(id => {
      const item    = MENU_ITEMS.find(m => m.id === id);
      if (!item) return '';
      const active  = ACTIVE_MODULES.includes(item.id);
      const starred = favs.includes(item.id);
      return '<button class="ale-menu-tile ale-tile-' + item.id +
        (active ? '' : ' ale-tile-inactive') +
        '" data-module="' + item.id + '">' +
        '<span class="ale-tile-star' + (starred ? ' starred' : '') +
        '" data-fav="' + item.id + '" title="Favourite" role="button" tabindex="0">&#9733;</span>' +
        item.label +
        (!active ? '<span class="ale-tile-badge wip">WIP</span>' : '') +
        '</button>';
    }).join('');

    panel.innerHTML =
      '<div class="ale-header">' +
        '<div><h2>ALE Pricing Hub</h2><p>Select a job type to begin</p></div>' +
        '<button class="ale-close-btn" id="ale-hub-close">✕</button>' +
      '</div>' +
      '<div class="ale-menu-body"><div class="ale-menu-grid">' + tilesHTML + '</div></div>' +
      '<div class="ale-menu-footer">ALE Group · 2026 Pricing</div>';

    gid('ale-hub-close').addEventListener('click', closePanel);

    panel.querySelectorAll('.ale-tile-star').forEach(star => {
      star.addEventListener('click', e => {
        e.stopPropagation();
        aleToggleFavourite(star.dataset.fav);
        buildMenu();
      });
    });

    panel.querySelectorAll('.ale-menu-tile:not(.ale-tile-inactive)').forEach(tile => {
      tile.addEventListener('click', () => {
        if (tile.dataset.module === 'acp')         buildAcpModule();
        if (tile.dataset.module === 'wrap')        buildWrapModule();
        if (tile.dataset.module === 'stickers')    buildStickersModule();
        if (tile.dataset.module === 'corflute')    buildCorflutesModule();
        if (tile.dataset.module === 'aframe')      buildAframeModule();
        if (tile.dataset.module === 'marquees')    buildMarqueesModule();
        if (tile.dataset.module === 'flags')       buildFlagsModule();
        if (tile.dataset.module === 'mediawalls')  buildMediaWallsModule();
        if (tile.dataset.module === 'tablecovers') buildTableCoversModule();
        if (tile.dataset.module === 'stationery')  buildStationeryModule();
        if (tile.dataset.module === 'stubby')      buildStubbyModule();
        if (tile.dataset.module === 'barmats')     buildBarMatsModule();
        if (tile.dataset.module === 'wideformat')  buildFenceMeshModule();
        if (tile.dataset.module === 'banners')     buildBannersModule();
      });
    });
  }


  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: ACP SIGNS
  // ════════════════════════════════════════════════════════════════════════════
  function buildAcpModule() {
    const firstType = ACP.TYPES[0];
    panel.innerHTML = moduleHeader('ACP Signs', 'Flat rate sheet quoting · inc. GST') + `
      <div class="ale-body">

        <div class="ale-field">
          <label>Job Description</label>
          <input type="text" id="acp-desc" class="ale-input" placeholder="Description…" />
        </div>

        <div class="ale-field">
          <label>Type</label>
          <div class="ale-select-wrap">
            <select id="acp-type" class="ale-select">
              ${ACP.TYPES.map(t => `<option value="${t.key}">${t.label}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="ale-field" id="acp-colour-field">
          <label>Sheet Colour</label>
          <input type="text" id="acp-colour" class="ale-input" placeholder="e.g. Matte Black, Signal Red…" />
        </div>

        <div class="ale-field">
          <label>Size</label>
          <div class="ale-select-wrap">
            <select id="acp-size" class="ale-select">
              ${firstType.sizes.map(s => `<option value="${s.rate}">${s.label} — $${s.rate}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="ale-field">
          <label>Quantity</label>
          <input type="number" id="acp-qty" class="ale-input" placeholder="1" min="1" step="1" />
        </div>

        <div class="ale-divider"></div>

        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle">
              <input type="checkbox" id="acp-art-check" />
              <span>Artwork &amp; Setup</span>
            </label>
            <div class="ale-artwork-input-wrap">
              <input type="number" id="acp-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled />
            </div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 – $100</div>
        </div>

        <div class="ale-divider"></div>

        <div id="acp-result-wrap">
          <div class="ale-no-result">Enter quantity to calculate</div>
        </div>

      </div>
      <div class="ale-footer">ALE ACP Signs · 2026 Pricing</div>`;

    wireHeader();

    function updateTypeFields() {
      const typeObj = ACP.TYPES.find(t => t.key === gid('acp-type').value);
      // Show/hide colour input
      gid('acp-colour-field').style.display = typeObj.hasColour ? '' : 'none';
      // Update sizes
      gid('acp-size').innerHTML = typeObj.sizes
        .map(s => `<option value="${s.rate}">${s.label} — $${s.rate}</option>`)
        .join('');
      acpCalc();
    }

    gid('acp-type').addEventListener('change', updateTypeFields);
    gid('acp-art-check').addEventListener('change', function() {
      gid('acp-art-val').disabled = !this.checked;
      if (!this.checked) gid('acp-art-val').value = '';
      acpCalc();
    });
    ['acp-desc','acp-colour','acp-qty','acp-art-val'].forEach(id => gid(id).addEventListener('input', acpCalc));
    gid('acp-size').addEventListener('change', acpCalc);

    // Init
    updateTypeFields();
  }

  function acpCalc() {
    const wrap = gid('acp-result-wrap'); if (!wrap) return;

    const typeKey    = gid('acp-type').value;
    const typeObj    = ACP.TYPES.find(t => t.key === typeKey);
    const rate       = parseFloat(gid('acp-size').value);
    const sizeLabel  = gid('acp-size').options[gid('acp-size').selectedIndex].text.split(' —')[0];
    const qty        = parseInt(gid('acp-qty').value) || 0;
    const desc       = gid('acp-desc').value.trim();
    const colour     = typeObj.hasColour ? (gid('acp-colour').value.trim()) : '';
    const artChecked = gid('acp-art-check').checked;
    const artVal     = artChecked ? (parseFloat(gid('acp-art-val').value) || 0) : 0;

    if (!qty || qty < 1) {
      wrap.innerHTML = '<div class="ale-no-result">Enter quantity to calculate</div>';
      return;
    }

    const unitCost = rate * qty;
    const total    = applyMinAndRound(unitCost + artVal);
    const perEach  = total / qty;

    const typeLabel = typeObj.label + (colour ? ' — ' + colour : '');
    const clipLines = [
      typeLabel,
      ...(desc ? [desc] : []),
      sizeLabel,
      'Qty ' + qty + ' @ $' + total.toFixed(2) + ' inc. GST',
    ];
    const clipText = clipLines.join('\n');

    wrap.innerHTML = `
      <div class="ale-result">
        <div class="ale-result-label">Estimated Total</div>
        <div class="ale-result-amount">$${total.toFixed(2)}</div>
        <div class="ale-result-breakdown">
          <span><span>${qty} × ${sizeLabel} @ $${rate.toFixed(2)}</span><b>$${unitCost.toFixed(2)}</b></span>
          ${artChecked && artVal > 0 ? `<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>` : ''}
          <span><span>Per sheet (after rounding)</span><b>$${perEach.toFixed(2)}</b></span>
          <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
        </div>
        <div class="ale-result-clip">${clipText}</div>
        ${actionsHTML("acp-copy-btn","acp-add-btn")}
      </div>`;

    wireActions('acp-copy-btn','acp-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: VEHICLE WRAPS
  // ════════════════════════════════════════════════════════════════════════════
  function buildWrapModule() {
    const W = WRAP;
    panel.innerHTML = `
      ${moduleHeader('Vehicle Wraps', 'Vinyl wrap quoting tool \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field">
          <label>Vehicle / Object Type</label>
          <input type="text" id="w-vehicle" class="ale-input" placeholder="Toyota HiLux, Trailer\u2026" />
          <div class="ale-hint">Used for line item labelling only</div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <label>Material</label>
          <div class="ale-inline-row">
            <div class="ale-input-wrap">
              <input type="number" id="w-mat-len" class="ale-input" placeholder="4500" min="1" step="1" />
              <span class="ale-input-unit">mm</span>
            </div>
            <div class="ale-select-wrap">
              <select id="w-material" class="ale-select">
                <option value="AV1105">AV1105 + 1460 Laminate \u2014 $${W.MATERIAL_RATE}/m</option>
              </select>
            </div>
          </div>
          <div class="ale-hint">Print length \u2014 width is fixed</div>
        </div>
        <div class="ale-field">
          <label>Colour Wrapping</label>
          <div class="ale-inline-row">
            <div class="ale-input-wrap">
              <input type="number" id="w-col-len" class="ale-input" placeholder="4500" min="1" step="1" />
              <span class="ale-input-unit">mm</span>
            </div>
            <div class="ale-select-wrap">
              <select id="w-colour" class="ale-select">
                <option value="Standard">Standard \u2014 $${W.COLOUR_RATES.Standard}/m</option>
                <option value="Specialty">Specialty \u2014 $${W.COLOUR_RATES.Specialty}/m</option>
              </select>
            </div>
          </div>
          <div class="ale-hint">Print length \u2014 width is fixed</div>
        </div>
        <div class="ale-field">
          <label>Contour Cutting</label>
          <div class="ale-select-wrap">
            <select id="w-contour" class="ale-select">
              <option value="">\u2014 None / not required \u2014</option>
              <option value="Simple">Simple \u2014 +5%</option>
              <option value="Standard">Standard \u2014 +15%</option>
              <option value="Complex">Complex \u2014 +30%</option>
              <option value="Insane">Insane \u2014 +50%</option>
            </select>
          </div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <label>Labour</label>
          <div class="ale-select-wrap">
            <select id="w-labour" class="ale-select">
              <option value="">\u2014 Select days \u2014</option>
              ${W.LABOUR_DAYS.map(d =>
                `<option value="${d}">${d === 0.5 ? 'Half day (0.5)' : `${d} day${d > 1 ? 's' : ''}`} \u2014 $${(d * W.HOURS_PER_DAY * W.LABOUR_RATE_HR).toFixed(0)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="ale-hint">$${W.LABOUR_RATE_HR}/hr \u00b7 ${W.HOURS_PER_DAY}hr day</div>
        </div>
        <div class="ale-divider"></div>
        <div id="w-result-wrap"><div class="ale-no-result">Enter print lengths &amp; labour days to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Vehicle Wraps \u00b7 2026 Pricing</div>`;
    wireHeader();
    ['w-vehicle','w-mat-len','w-col-len','w-material','w-colour','w-contour','w-labour'].forEach(id => {
      const el = gid(id); el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', wrapCalc);
    });
    wrapCalc();
  }

  function wrapCalc() {
    const W = WRAP, wrap = gid('w-result-wrap'); if (!wrap) return;
    const vehicle=gid('w-vehicle').value.trim(), matLenMM=parseFloat(gid('w-mat-len').value),
          colLenMM=parseFloat(gid('w-col-len').value), colourType=gid('w-colour').value,
          labourDays=parseFloat(gid('w-labour').value), contour=gid('w-contour').value;
    if ((!matLenMM||matLenMM<=0)&&(!colLenMM||colLenMM<=0)||!labourDays) {
      wrap.innerHTML='<div class="ale-no-result">Enter print lengths &amp; labour days to calculate</div>'; return;
    }
    const matM=matLenMM>0?matLenMM/1000:0, colM=colLenMM>0?colLenMM/1000:0;
    const matCost=matM*W.MATERIAL_RATE, colCost=colM*W.COLOUR_RATES[colourType],
          labourCost=labourDays*W.HOURS_PER_DAY*W.LABOUR_RATE_HR, setupCost=W.SETUP_FEE;
    const subtotal=matCost+colCost+labourCost+setupCost, contourCost=contour?subtotal*W.CONTOUR_RATES[contour]:0, total=subtotal+contourCost;
    const vehicleLabel=vehicle||'Vehicle Wrap', colourLabel=colourType==='Specialty'?'Specialty Colour Wrapping':'Standard Colour Wrapping';
    const clipText=['Vinyl Wrap - '+vehicleLabel+':','','  - Premium Laminated Vinyl Wrap','  - '+colourLabel,
      ...(contour?['  - Contour Cutting']:[]),'  - Labour ('+labourDays+' day'+(labourDays!==1?'s':'')+')',
      '  - Setup','','  Total: $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div><div class="ale-result-breakdown">
      <span><span>Premium Laminated Vinyl Wrap</span><b>$${matCost.toFixed(2)}</b></span>
      <span><span>${colourLabel}</span><b>$${colCost.toFixed(2)}</b></span>
      ${contour?`<span><span>Contour Cutting</span><b>$${contourCost.toFixed(2)}</b></span>`:''}
      <span><span>Labour (${labourDays} day${labourDays!==1?'s':''})</span><b>$${labourCost.toFixed(2)}</b></span>
      <span><span>Setup</span><b>$${setupCost.toFixed(2)}</b></span>
      <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
    </div>${actionsHTML("w-copy-btn","w-add-btn")}</div>`;
    wireActions('w-copy-btn','w-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: STICKERS
  // ════════════════════════════════════════════════════════════════════════════
  function buildStickersModule() {
    panel.innerHTML = `
      ${moduleHeader('Stickers', 'Digitally printed sticker quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="s-desc" class="ale-input" placeholder="Description of stickers\u2026" /></div>
        <div class="ale-field"><label>Print Type</label><div class="ale-select-wrap"><select id="s-type" class="ale-select">${STICKER.TYPES.map(t=>`<option value="${t.key}">${t.label}${t.rate?` \u2014 $${t.rate}/m`:''}</option>`).join('')}</select></div></div>
        <div class="ale-field" id="s-custom-rate-field" style="display:none;"><label>Custom Rate</label><div class="ale-input-wrap"><input type="number" id="s-custom-rate" class="ale-input" placeholder="0.00" min="0" step="0.01" /><span class="ale-input-unit">$/m</span></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field"><label>Sticker Dimensions</label>
          <div class="ale-three-col">
            <div class="ale-input-wrap"><input type="number" id="s-width" class="ale-input" placeholder="Width" min="1" step="1" /><span class="ale-input-unit">mm</span></div>
            <span class="ale-three-col-sep">\u00d7</span>
            <div class="ale-input-wrap"><input type="number" id="s-height" class="ale-input" placeholder="Height" min="1" step="1" /><span class="ale-input-unit">mm</span></div>
          </div>
          <div class="ale-hint">Single sticker \u2014 printer width is ${STICKER.PRINTER_WIDTH}mm</div>
        </div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="s-qty" class="ale-input" placeholder="25" min="1" step="1" /></div>
        <div class="ale-divider"></div>
        <div class="ale-field"><label>Contour Cutting</label><div class="ale-select-wrap"><select id="s-contour" class="ale-select"><option value="">\u2014 None / not required \u2014</option><option value="Simple">Simple \u2014 +5%</option><option value="Standard">Standard \u2014 +15%</option><option value="Complex">Complex \u2014 +30%</option><option value="Insane">Insane \u2014 +50%</option></select></div></div>
        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle"><input type="checkbox" id="s-art-check" /><span>Artwork &amp; Setup</span></label>
            <div class="ale-artwork-input-wrap"><input type="number" id="s-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="s-result-wrap"><div class="ale-no-result">Enter dimensions &amp; quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Stickers \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('s-type').addEventListener('change',function(){gid('s-custom-rate-field').style.display=this.value==='other'?'':'none';stickerCalc();});
    gid('s-art-check').addEventListener('change',function(){gid('s-art-val').disabled=!this.checked;if(!this.checked)gid('s-art-val').value='';stickerCalc();});
    ['s-desc','s-custom-rate','s-width','s-height','s-qty','s-art-val'].forEach(id=>gid(id).addEventListener('input',stickerCalc));
    ['s-type','s-contour'].forEach(id=>gid(id).addEventListener('change',stickerCalc));
    stickerCalc();
  }

  function stickerCalc() {
    const wrap=gid('s-result-wrap'); if(!wrap)return;
    const typeKey=gid('s-type').value, stickerW=parseFloat(gid('s-width').value), stickerH=parseFloat(gid('s-height').value),
          qty=parseInt(gid('s-qty').value), contour=gid('s-contour').value,
          artChecked=gid('s-art-check').checked, artVal=parseFloat(gid('s-art-val').value)||0,
          desc=gid('s-desc').value.trim();
    const typeObj=STICKER.TYPES.find(t=>t.key===typeKey);
    const ratePerM=typeKey==='other'?(parseFloat(gid('s-custom-rate').value)||null):typeObj.rate;
    if(!stickerW||!stickerH||!qty||!ratePerM){wrap.innerHTML='<div class="ale-no-result">Enter dimensions, quantity &amp; rate to calculate</div>';return;}
    const pw=STICKER.PRINTER_WIDTH;
    function calcY(across,down){const perRow=Math.floor(pw/across);return perRow===0?null:Math.ceil(qty/perRow)*down;}
    const yA=calcY(stickerW,stickerH),yB=calcY(stickerH,stickerW);
    if(!yA&&!yB){wrap.innerHTML='<div class="ale-no-result">Sticker is wider than the printer ('+pw+'mm)</div>';return;}
    let bestY,dimAcross,dimDown;
    if(yA&&yB){if(yA<=yB){bestY=yA;dimAcross=stickerW;dimDown=stickerH;}else{bestY=yB;dimAcross=stickerH;dimDown=stickerW;}}
    else if(yA){bestY=yA;dimAcross=stickerW;dimDown=stickerH;}else{bestY=yB;dimAcross=stickerH;dimDown=stickerW;}
    const perRow=Math.floor(pw/dimAcross),rows=Math.ceil(qty/perRow),printM=bestY/1000,printCost=printM*ratePerM;
    const artCost=artChecked?artVal:0,subtotal=printCost+artCost,contourCost=contour?subtotal*STICKER.CONTOUR_RATES[contour]:0;
    const total=applyMinAndRound(subtotal+contourCost),perUnit=total/qty;
    const clipText=[typeObj.label,...(desc?[desc]:[]),stickerW+'mm x '+stickerH+'mm','Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    const layoutNote=perRow+' per row \u00d7 '+rows+' row'+(rows!==1?'s':'')+' = '+bestY.toFixed(0)+'mm print length';
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div>
      <div class="ale-result-breakdown">
        <span><span>Print (${printM.toFixed(3)}m @ $${ratePerM}/m)</span><b>$${printCost.toFixed(2)}</b></span>
        ${contour?`<span><span>Contour Cutting</span><b>$${contourCost.toFixed(2)}</b></span>`:''}
        ${artChecked&&artCost>0?`<span><span>Artwork &amp; Setup</span><b>$${artCost.toFixed(2)}</b></span>`:''}
        <span><span>Per sticker</span><b>$${perUnit.toFixed(2)}</b></span>
        <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
      </div>
      <div class="ale-hint" style="margin-top:8px;">Layout: ${layoutNote}</div>
      <div class="ale-result-clip">${clipText}</div>
      ${actionsHTML("s-copy-btn","s-add-btn")}
    </div>`;
    wireActions('s-copy-btn','s-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: CORFLUTES
  // ════════════════════════════════════════════════════════════════════════════
  function buildCorflutesModule() {
    const firstType=CORFLUTE.TYPES[0];
    panel.innerHTML=`
      ${moduleHeader('Corflutes','Corflute sign quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="c-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Corflute Type</label><div class="ale-select-wrap"><select id="c-type" class="ale-select">${CORFLUTE.TYPES.map(t=>`<option value="${t.key}">${t.label}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Size</label><div class="ale-select-wrap"><select id="c-size" class="ale-select">${firstType.sizes.map(s=>`<option value="${s.label}">${s.label}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="c-qty" class="ale-input" placeholder="10" min="1" step="1" /><div class="ale-hint" id="c-qty-hint"></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle"><input type="checkbox" id="c-art-check" /><span>Artwork &amp; Setup</span></label>
            <div class="ale-artwork-input-wrap"><input type="number" id="c-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="c-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Corflutes \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('c-type').addEventListener('change',()=>{const t=CORFLUTE.TYPES.find(t=>t.key===gid('c-type').value);gid('c-size').innerHTML=t.sizes.map(s=>`<option value="${s.label}">${s.label}</option>`).join('');corflutesCalc();});
    gid('c-art-check').addEventListener('change',function(){gid('c-art-val').disabled=!this.checked;if(!this.checked)gid('c-art-val').value='';corflutesCalc();});
    gid('c-size').addEventListener('change',corflutesCalc);
    ['c-desc','c-qty','c-art-val'].forEach(id=>gid(id).addEventListener('input',corflutesCalc));
    corflutesCalc();
  }

  function corflutesCalc() {
    const wrap=gid('c-result-wrap'); if(!wrap)return;
    const typeKey=gid('c-type').value, sizeLabel=gid('c-size').value, qty=parseInt(gid('c-qty').value), desc=gid('c-desc').value.trim(), hintEl=gid('c-qty-hint');
    const typeObj=CORFLUTE.TYPES.find(t=>t.key===typeKey), sizeObj=typeObj.sizes.find(s=>s.label===sizeLabel);
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';if(hintEl)hintEl.textContent='';return;}
    let rateEach,tierNote='';
    if(sizeObj.tiered){
      const eligible=sizeObj.tiered.filter(t=>qty>=t.minQty);
      if(eligible.length===0){const minQ=sizeObj.tiered[0].minQty;if(hintEl)hintEl.textContent='Minimum quantity is '+minQ;wrap.innerHTML='<div class="ale-no-result">Minimum quantity for this size is '+minQ+'</div>';return;}
      rateEach=eligible[eligible.length-1].rate;
      const nextTier=sizeObj.tiered.find(t=>t.minQty>qty);
      if(nextTier)tierNote='Next price break at '+nextTier.minQty+'+ \u2014 $'+nextTier.rate.toFixed(2)+'/ea';
      if(hintEl)hintEl.textContent=tierNote;
    }else{rateEach=sizeObj.rate;if(hintEl)hintEl.textContent='';}
    const artChecked=gid('c-art-check')&&gid('c-art-check').checked, artVal=artChecked?(parseFloat(gid('c-art-val').value)||0):0;
    const rawSignCost=rateEach*qty, total=applyMinAndRound(rawSignCost+artVal), perEach=total/qty;
    const clipText=[typeObj.label,...(desc?[desc]:[]),sizeLabel,'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div>
      <div class="ale-result-breakdown">
        <span><span>${qty} \u00d7 ${sizeLabel} @ $${rateEach.toFixed(2)}</span><b>$${rawSignCost.toFixed(2)}</b></span>
        ${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}
        <span><span>Per sign (after rounding)</span><b>$${perEach.toFixed(2)}</b></span>
        <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
      </div>
      ${tierNote?`<div class="ale-hint" style="margin-top:8px;">${tierNote}</div>`:''}
      <div class="ale-result-clip">${clipText}</div>
      ${actionsHTML("c-copy-btn","c-add-btn")}
    </div>`;
    wireActions('c-copy-btn','c-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: A-FRAMES & RETRACTABLES
  // ════════════════════════════════════════════════════════════════════════════
  function buildAframeModule() {
    const firstType=AFRAME.TYPES[0];
    panel.innerHTML=`
      ${moduleHeader('A-Frames &amp; Retractables','Display &amp; signage quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="af-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Type</label><div class="ale-select-wrap"><select id="af-type" class="ale-select">${AFRAME.TYPES.map(t=>`<option value="${t.key}">${t.label}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Size</label><div class="ale-select-wrap"><select id="af-size" class="ale-select">${firstType.sizes.map(s=>`<option value="${s.label}">${s.label}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="af-qty" class="ale-input" placeholder="1" min="1" step="1" /><div class="ale-hint" id="af-qty-hint"></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle"><input type="checkbox" id="af-art-check" /><span>Artwork &amp; Setup</span></label>
            <div class="ale-artwork-input-wrap"><input type="number" id="af-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="af-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE A-Frames &amp; Retractables \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('af-type').addEventListener('change',()=>{const t=AFRAME.TYPES.find(t=>t.key===gid('af-type').value);gid('af-size').innerHTML=t.sizes.map(s=>`<option value="${s.label}">${s.label}</option>`).join('');aframeCalc();});
    gid('af-art-check').addEventListener('change',function(){gid('af-art-val').disabled=!this.checked;if(!this.checked)gid('af-art-val').value='';aframeCalc();});
    gid('af-size').addEventListener('change',aframeCalc);
    ['af-desc','af-qty','af-art-val'].forEach(id=>gid(id).addEventListener('input',aframeCalc));
    aframeCalc();
  }

  function aframeCalc() {
    const wrap=gid('af-result-wrap'); if(!wrap)return;
    const typeKey=gid('af-type').value, sizeLabel=gid('af-size').value, qty=parseInt(gid('af-qty').value),
          desc=gid('af-desc').value.trim(), artChecked=gid('af-art-check').checked, artVal=artChecked?(parseFloat(gid('af-art-val').value)||0):0, hintEl=gid('af-qty-hint');
    const typeObj=AFRAME.TYPES.find(t=>t.key===typeKey), sizeObj=typeObj.sizes.find(s=>s.label===sizeLabel);
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';if(hintEl)hintEl.textContent='';return;}
    let rateEach,tierNote='';
    if(sizeObj.tiered){const eligible=sizeObj.tiered.filter(t=>qty>=t.minQty);rateEach=eligible[eligible.length-1].rate;const nextTier=sizeObj.tiered.find(t=>t.minQty>qty);if(nextTier)tierNote='Next price break at '+nextTier.minQty+'+ \u2014 $'+nextTier.rate.toFixed(2)+'/ea';if(hintEl)hintEl.textContent=tierNote;}
    else{rateEach=sizeObj.rate;if(hintEl)hintEl.textContent='';}
    const rawUnitCost=rateEach*qty, total=applyMinAndRound(rawUnitCost+artVal), perEach=total/qty;
    const clipText=[typeObj.label,...(desc?[desc]:[]),sizeLabel,'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div>
      <div class="ale-result-breakdown">
        <span><span>${qty} \u00d7 ${typeObj.label.split(' - ')[0]} @ $${rateEach.toFixed(2)}</span><b>$${rawUnitCost.toFixed(2)}</b></span>
        ${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}
        <span><span>Per unit (after rounding)</span><b>$${perEach.toFixed(2)}</b></span>
        <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
      </div>
      ${tierNote?`<div class="ale-hint" style="margin-top:8px;">${tierNote}</div>`:''}
      <div class="ale-result-clip">${clipText}</div>
      ${actionsHTML("af-copy-btn","af-add-btn")}
    </div>`;
    wireActions('af-copy-btn','af-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: MARQUEES
  // ════════════════════════════════════════════════════════════════════════════
  function buildMarqueesModule() {
    panel.innerHTML=`
      ${moduleHeader('Marquees','Marquee quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="mq-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Marquee Size</label><div class="ale-select-wrap"><select id="mq-size" class="ale-select"><option value="3x3">3\u00d73 \u2014 Full Kit (Frame &amp; printed canopy) \u2014 $1,125</option><option value="6x3">6\u00d73 \u2014 Full Kit (Frame &amp; printed canopy) \u2014 $1,865</option></select></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="mq-qty" class="ale-input" placeholder="1" min="1" step="1" /><div class="ale-hint" id="mq-qty-hint"></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <label>Additional Walls</label>
          <div class="ale-hint" style="margin-bottom:6px;">Each wall is priced individually \u2014 enter how many of each type</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;font-size:11px;font-weight:500;color:#555;">Single Sided</div><div style="width:80px;"><input type="number" id="mq-wall-single" class="ale-input" placeholder="0" min="0" step="1" style="text-align:center;" /></div><div style="width:60px;font-size:10px;color:#bbb;text-align:right;" id="mq-wall-single-rate"></div></div>
            <div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;font-size:11px;font-weight:500;color:#555;">Double Sided</div><div style="width:80px;"><input type="number" id="mq-wall-double" class="ale-input" placeholder="0" min="0" step="1" style="text-align:center;" /></div><div style="width:60px;font-size:10px;color:#bbb;text-align:right;" id="mq-wall-double-rate"></div></div>
            <div style="display:flex;align-items:center;gap:8px;" id="mq-half-row"><div style="flex:1;font-size:11px;font-weight:500;color:#555;">Half Wall</div><div style="width:80px;"><input type="number" id="mq-half" class="ale-input" placeholder="0" min="0" step="1" style="text-align:center;" /></div><div style="width:60px;font-size:10px;color:#bbb;text-align:right;">$335/ea</div></div>
          </div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle"><input type="checkbox" id="mq-art-check" /><span>Artwork &amp; Setup</span></label>
            <div class="ale-artwork-input-wrap"><input type="number" id="mq-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="mq-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Marquees \u00b7 2026 Pricing</div>`;
    wireHeader();
    function updateWallRates(){const sz=MARQUEE.SIZES[gid('mq-size').value];gid('mq-wall-single-rate').textContent='$'+sz.wallSingle+'/ea';gid('mq-wall-double-rate').textContent='$'+sz.wallDouble+'/ea';}
    gid('mq-size').addEventListener('change',()=>{updateWallRates();marqueesCalc();});
    gid('mq-art-check').addEventListener('change',function(){gid('mq-art-val').disabled=!this.checked;if(!this.checked)gid('mq-art-val').value='';marqueesCalc();});
    ['mq-desc','mq-qty','mq-wall-single','mq-wall-double','mq-half','mq-art-val'].forEach(id=>gid(id).addEventListener('input',marqueesCalc));
    updateWallRates(); marqueesCalc();
  }

  function marqueesCalc() {
    const wrap=gid('mq-result-wrap'); if(!wrap)return;
    const sizeKey=gid('mq-size').value, qty=parseInt(gid('mq-qty').value)||0, desc=gid('mq-desc').value.trim(),
          wallSingle=parseInt(gid('mq-wall-single').value)||0, wallDouble=parseInt(gid('mq-wall-double').value)||0,
          half=parseInt(gid('mq-half').value)||0, hintEl=gid('mq-qty-hint');
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';if(hintEl)hintEl.textContent='';return;}
    const sz=MARQUEE.SIZES[sizeKey], discount=MARQUEE.QTY_DISCOUNTS.find(d=>qty>=d.minQty), discountPct=discount?discount.pct:0;
    if(hintEl)hintEl.textContent=discount?(discountPct*100).toFixed(0)+'% qty discount applied':'';
    const baseCost=sz.base*(1-discountPct)*qty, wallSingleCost=wallSingle*sz.wallSingle, wallDoubleCost=wallDouble*sz.wallDouble,
          halfCost=half*335;
    const artChecked=gid('mq-art-check')&&gid('mq-art-check').checked, artVal=artChecked?(parseFloat(gid('mq-art-val').value)||0):0;
    const total=applyMinAndRound(baseCost+wallSingleCost+wallDoubleCost+halfCost+artVal);
    const lines=[sz.label.replace(' (Frame & printed canopy)',''),...(desc?[desc]:[]),'Qty '+qty];
    if(wallSingle>0)lines.push('  + '+wallSingle+'\u00d7 Additional Wall (Single Sided)');
    if(wallDouble>0)lines.push('  + '+wallDouble+'\u00d7 Additional Wall (Double Sided)');
    if(half>0)lines.push('  + '+half+'\u00d7 Half Wall');
    lines.push('Total: $'+total.toFixed(2)+' inc. GST');
    const clipText=lines.join('\n');
    let bdRows='<span><span>'+qty+'\u00d7 '+sizeKey.toUpperCase()+' Kit'+(discountPct?' ('+(discountPct*100).toFixed(0)+'% off)':'')+' </span><b>$'+baseCost.toFixed(2)+'</b></span>';
    if(wallSingle>0)bdRows+='<span><span>'+wallSingle+'\u00d7 Wall Single Sided</span><b>$'+wallSingleCost.toFixed(2)+'</b></span>';
    if(wallDouble>0)bdRows+='<span><span>'+wallDouble+'\u00d7 Wall Double Sided</span><b>$'+wallDoubleCost.toFixed(2)+'</b></span>';
    if(half>0)bdRows+='<span><span>'+half+'\u00d7 Half Wall</span><b>$'+halfCost.toFixed(2)+'</b></span>';
    if(artChecked&&artVal>0)bdRows+='<span><span>Artwork &amp; Setup</span><b>$'+artVal.toFixed(2)+'</b></span>';
    bdRows+='<span class="ale-bd-total"><span>Total inc. GST</span><span>$'+total.toFixed(2)+'</span></span>';
    wrap.innerHTML='<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$'+total.toFixed(2)+'</div><div class="ale-result-breakdown">'+bdRows+'</div><div class="ale-result-clip">'+clipText+'</div>'+actionsHTML('mq-copy-btn','mq-add-btn')+'</div>';
    wireActions('mq-copy-btn','mq-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: FLAGS
  // ════════════════════════════════════════════════════════════════════════════
  function buildFlagsModule() {
    panel.innerHTML=`
      ${moduleHeader('Flags','Flag quoting \u00b7 inc. GST \u00b7 ground spike base included')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="fl-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Shape</label><div class="ale-select-wrap"><select id="fl-shape" class="ale-select"><option value="feather">Feather Flag</option><option value="teardrop">Teardrop Flag</option><option value="printed">Printed Flag (1800mm \u00d7 900mm)</option></select></div></div>
        <div class="ale-field" id="fl-size-field"><label>Size</label><div class="ale-select-wrap"><select id="fl-size" class="ale-select"><option value="small">Small 2.5m</option><option value="large">Large 3.5m</option></select></div></div>
        <div class="ale-field"><label>Sides</label><div class="ale-select-wrap"><select id="fl-sides" class="ale-select"><option value="single">Single Sided</option><option value="double">Double Sided</option></select></div></div>
        <div class="ale-field" id="fl-bottom-field"><label>Bottom Style <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px">(Feather only)</span></label><div class="ale-select-wrap"><select id="fl-bottom" class="ale-select"><option value="curved">Curved</option><option value="angled">Angled</option><option value="straight">Straight</option></select></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="fl-qty" class="ale-input" placeholder="1" min="1" step="1" /><div class="ale-hint" id="fl-qty-hint"></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <label>Additional Hardware <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:9px">+$70 each \u00b7 ground spike included</span></label>
          <div style="display:flex;flex-direction:column;gap:6px;" id="fl-hardware-list">
            ${FLAGS.HARDWARE_OPTIONS.map((opt,i)=>`<label style="display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none;"><input type="checkbox" class="fl-hw-check" data-hw="${i}" style="appearance:none;-webkit-appearance:none;width:16px;height:16px;border:1.5px solid #ddd;border-radius:5px;background:#fafafa;cursor:pointer;position:relative;top:1px;transition:background 0.15s,border-color 0.15s;flex-shrink:0;" /><span style="font-size:11px;font-weight:500;color:#555;">${opt}</span><span style="margin-left:auto;font-size:10px;color:#bbb;font-weight:600;">+$70</span></label>`).join('')}
          </div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle"><input type="checkbox" id="fl-art-check" /><span>Artwork &amp; Setup</span></label>
            <div class="ale-artwork-input-wrap"><input type="number" id="fl-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="fl-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Flags \u00b7 2026 Pricing</div>`;
    wireHeader();
    function updateShapeFields(){const shape=gid('fl-shape').value,isPrinted=shape==='printed',isFeather=shape==='feather';gid('fl-bottom-field').style.display=isFeather?'':'none';gid('fl-size-field').style.display=isPrinted?'none':'';gid('fl-hardware-list').closest('.ale-field').style.display=isPrinted?'none':'';if(!isPrinted){gid('fl-size').innerHTML=isFeather?'<option value="small">Small 2.5m</option><option value="large">Large 3.5m</option>':'<option value="small">Small 1.85m</option><option value="large">Large 2.75m</option>';}flagsCalc();}
    gid('fl-shape').addEventListener('change',updateShapeFields);
    panel.querySelectorAll('.fl-hw-check').forEach(cb=>cb.addEventListener('change',function(){this.style.background=this.checked?'#DA0C0C':'#fafafa';this.style.borderColor=this.checked?'#DA0C0C':'#ddd';flagsCalc();}));
    gid('fl-art-check').addEventListener('change',function(){gid('fl-art-val').disabled=!this.checked;if(!this.checked)gid('fl-art-val').value='';flagsCalc();});
    ['fl-desc','fl-qty','fl-art-val'].forEach(id=>gid(id).addEventListener('input',flagsCalc));
    ['fl-size','fl-sides','fl-bottom'].forEach(id=>gid(id).addEventListener('change',flagsCalc));
    flagsCalc();
  }

  function flagsCalc() {
    const wrap=gid('fl-result-wrap'); if(!wrap)return;
    const shape=gid('fl-shape').value, sizeKey=gid('fl-size').value, sides=gid('fl-sides').value,
          bottom=shape==='feather'?gid('fl-bottom').value:null, qty=parseInt(gid('fl-qty').value)||0,
          desc=gid('fl-desc').value.trim(), artChecked=gid('fl-art-check').checked, artVal=artChecked?(parseFloat(gid('fl-art-val').value)||0):0, hintEl=gid('fl-qty-hint');
    const hwChecked=[...panel.querySelectorAll('.fl-hw-check')].filter(cb=>cb.checked), hwCount=hwChecked.length, hwCost=hwCount*FLAGS.HARDWARE_FEE, hwLabels=hwChecked.map(cb=>FLAGS.HARDWARE_OPTIONS[parseInt(cb.dataset.hw)]);
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';if(hintEl)hintEl.textContent='';return;}
    let flagsCost,fullLabel,discAmt=0;
    if(shape==='printed'){const pObj=sides==='double'?FLAGS.PRINTED.double:FLAGS.PRINTED.single;flagsCost=pObj.rate*qty;fullLabel=pObj.label+' \u2014 1800mm \u00d7 900mm';if(hintEl)hintEl.textContent='';}
    else{const priceTable=shape==='feather'?FLAGS.FEATHER:FLAGS.TEARDROP,sizeObj=priceTable[sizeKey],baseEach=sides==='double'?sizeObj.double:sizeObj.single;const qtyDisc=FLAGS.QTY_DISCOUNTS.find(d=>qty>=d.minQty);discAmt=qtyDisc?qtyDisc.discount:0;flagsCost=(baseEach-discAmt)*qty;const shapeLabel=shape==='feather'?'Feather Flag':'Teardrop Flag',sidesLabel=sides==='double'?'Double Sided':'Single Sided',bottomLabel=bottom?' \u2014 '+bottom.charAt(0).toUpperCase()+bottom.slice(1):'';fullLabel=shapeLabel+' '+sizeObj.label+' \u2014 '+sidesLabel+bottomLabel;if(hintEl)hintEl.textContent=qtyDisc?'Qty discount: $'+discAmt+' off each':'';}
    const total=applyMinAndRound(flagsCost+(shape==='printed'?0:hwCost)+artVal);
    const clipLines=[fullLabel,...(desc?[desc]:[]),'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST',...(shape!=='printed'&&hwLabels.length>0?['Hardware: '+hwLabels.join(', ')]:[])] ;
    const clipText=clipLines.join('\n');
    let bdRows='<span><span>'+qty+'\u00d7 '+fullLabel+'</span><b>$'+flagsCost.toFixed(2)+'</b></span>';
    if(discAmt>0)bdRows+='<span><span>Qty discount ($'+discAmt+'/ea)</span><b>\u2212$'+(discAmt*qty).toFixed(2)+'</b></span>';
    if(shape!=='printed'&&hwCount>0)bdRows+='<span><span>'+hwCount+'\u00d7 Additional Hardware</span><b>$'+hwCost.toFixed(2)+'</b></span>';
    if(artChecked&&artVal>0)bdRows+='<span><span>Artwork &amp; Setup</span><b>$'+artVal.toFixed(2)+'</b></span>';
    bdRows+='<span class="ale-bd-total"><span>Total inc. GST</span><span>$'+total.toFixed(2)+'</span></span>';
    wrap.innerHTML='<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$'+total.toFixed(2)+'</div><div class="ale-result-breakdown">'+bdRows+'</div><div class="ale-result-clip">'+clipText+'</div>'+actionsHTML('fl-copy-btn','fl-add-btn')+'</div>';
    wireActions('fl-copy-btn','fl-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: MEDIA WALLS
  // ════════════════════════════════════════════════════════════════════════════
  function buildMediaWallsModule() {
    panel.innerHTML=`
      ${moduleHeader('Media Walls','Media wall quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="mw-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Size &amp; Sides</label><div class="ale-select-wrap"><select id="mw-size" class="ale-select">${MEDIAWALLS.SIZES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Finish</label><div class="ale-select-wrap"><select id="mw-finish" class="ale-select">${MEDIAWALLS.FINISH.map(f=>`<option value="${f.key}">${f.label}</option>`).join('')}</select></div><div class="ale-hint" id="mw-price-hint"></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="mw-qty" class="ale-input" placeholder="1" min="1" step="1" /></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row"><label class="ale-artwork-toggle"><input type="checkbox" id="mw-art-check" /><span>Artwork &amp; Setup</span></label><div class="ale-artwork-input-wrap"><input type="number" id="mw-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div></div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="mw-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Media Walls \u00b7 2026 Pricing</div>`;
    wireHeader();
    function updateFinishOptions(){const sizeObj=MEDIAWALLS.SIZES.find(s=>s.key===gid('mw-size').value),finishEl=gid('mw-finish'),hintEl=gid('mw-price-hint');[...finishEl.options].forEach(opt=>{if(opt.value==='print'){opt.disabled=sizeObj.printRate===null;if(opt.disabled&&finishEl.value==='print')finishEl.value='kit';}});hintEl.textContent='$'+(finishEl.value==='print'?sizeObj.printRate:sizeObj.kitRate).toLocaleString()+' per unit';mediaWallsCalc();}
    gid('mw-size').addEventListener('change',updateFinishOptions); gid('mw-finish').addEventListener('change',updateFinishOptions);
    gid('mw-art-check').addEventListener('change',function(){gid('mw-art-val').disabled=!this.checked;if(!this.checked)gid('mw-art-val').value='';mediaWallsCalc();});
    ['mw-desc','mw-qty','mw-art-val'].forEach(id=>gid(id).addEventListener('input',mediaWallsCalc));
    updateFinishOptions();
  }

  function mediaWallsCalc() {
    const wrap=gid('mw-result-wrap'); if(!wrap)return;
    const sizeKey=gid('mw-size').value,finishKey=gid('mw-finish').value,qty=parseInt(gid('mw-qty').value)||0,desc=gid('mw-desc').value.trim(),artChecked=gid('mw-art-check').checked,artVal=artChecked?(parseFloat(gid('mw-art-val').value)||0):0;
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';return;}
    const sizeObj=MEDIAWALLS.SIZES.find(s=>s.key===sizeKey),finishObj=MEDIAWALLS.FINISH.find(f=>f.key===finishKey);
    const unitRate=finishKey==='print'?sizeObj.printRate:sizeObj.kitRate,unitCost=unitRate*qty,total=applyMinAndRound(unitCost+artVal);
    const fullLabel='Media Wall '+sizeObj.label+' \u2014 '+finishObj.label;
    const clipText=[fullLabel,...(desc?[desc]:[]),'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div><div class="ale-result-breakdown"><span><span>${qty}\u00d7 ${sizeObj.label}</span><b>$${unitCost.toFixed(2)}</b></span>${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}<span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span></div><div class="ale-result-clip">${clipText}</div>${actionsHTML("mw-copy-btn","mw-add-btn")}</div>`;
    wireActions('mw-copy-btn','mw-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: TABLE COVERS
  // ════════════════════════════════════════════════════════════════════════════
  function buildTableCoversModule() {
    panel.innerHTML=`
      ${moduleHeader('Table Covers','Table cover quoting \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="tc-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Style</label><div class="ale-select-wrap"><select id="tc-style" class="ale-select">${TABLECOVERS.STYLES.map(s=>`<option value="${s}">${s}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Size</label><div class="ale-select-wrap"><select id="tc-size" class="ale-select">${TABLECOVERS.SIZES.map(s=>`<option value="${s.key}">${s.label} \u2014 $${s.rate}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Rear Option</label><div class="ale-select-wrap"><select id="tc-rear" class="ale-select">${TABLECOVERS.REAR_OPTIONS.map(r=>`<option value="${r.key}">${r.label}${r.surcharge?` (+$${r.surcharge})`:''}</option>`).join('')}</select></div></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="tc-qty" class="ale-input" placeholder="1" min="1" step="1" /></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row"><label class="ale-artwork-toggle"><input type="checkbox" id="tc-art-check" /><span>Artwork &amp; Setup</span></label><div class="ale-artwork-input-wrap"><input type="number" id="tc-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div></div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div id="tc-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Table Covers \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('tc-art-check').addEventListener('change',function(){gid('tc-art-val').disabled=!this.checked;if(!this.checked)gid('tc-art-val').value='';tableCoversCalc();});
    ['tc-desc','tc-qty','tc-art-val'].forEach(id=>gid(id).addEventListener('input',tableCoversCalc));
    ['tc-style','tc-size','tc-rear'].forEach(id=>gid(id).addEventListener('change',tableCoversCalc));
    tableCoversCalc();
  }

  function tableCoversCalc() {
    const wrap=gid('tc-result-wrap'); if(!wrap)return;
    const style=gid('tc-style').value,sizeKey=gid('tc-size').value,rearKey=gid('tc-rear').value,qty=parseInt(gid('tc-qty').value)||0,desc=gid('tc-desc').value.trim(),artChecked=gid('tc-art-check').checked,artVal=artChecked?(parseFloat(gid('tc-art-val').value)||0):0;
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';return;}
    const sizeObj=TABLECOVERS.SIZES.find(s=>s.key===sizeKey),rearObj=TABLECOVERS.REAR_OPTIONS.find(r=>r.key===rearKey);
    const unitCost=(sizeObj.rate+rearObj.surcharge)*qty,total=applyMinAndRound(unitCost+artVal);
    const fullLabel=style+' Table Cover \u2014 '+sizeObj.label,clipText=[fullLabel,...(desc?[desc]:[]),rearObj.label,'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div><div class="ale-result-breakdown"><span><span>${qty}\u00d7 ${style} \u2014 ${sizeObj.label}</span><b>$${(sizeObj.rate*qty).toFixed(2)}</b></span>${rearObj.surcharge>0?`<span><span>${rearObj.label}</span><b>$${(rearObj.surcharge*qty).toFixed(2)}</b></span>`:''}${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}<span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span></div><div class="ale-result-clip">${clipText}</div>${actionsHTML("tc-copy-btn","tc-add-btn")}</div>`;
    wireActions('tc-copy-btn','tc-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: STATIONERY
  // ════════════════════════════════════════════════════════════════════════════
  function buildStationeryModule() {
    const PRODUCTS=statGetAll(), customKeys=Object.keys(loadStatCustom());
    panel.innerHTML=`
      ${moduleHeader('Stationery','2026 pricing \u00b7 all amounts inc. GST')}
      <div class="ale-body">
        <div class="ale-field">
          <label>Product</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <div class="ale-select-wrap" style="flex:1;"><select id="st-product" class="ale-select"><option value="">\u2014 Select a product \u2014</option>${Object.keys(PRODUCTS).map(k=>`<option value="${k}">${k}${customKeys.includes(k)?' \u2605':''}</option>`).join('')}</select></div>
            <button id="st-delete-btn" title="Remove custom product" style="display:none;background:none;border:none;cursor:pointer;color:#ccc;font-size:16px;padding:0 3px;line-height:1;transition:color 0.15s;flex-shrink:0;">&#x2715;</button>
          </div>
          <div class="ale-hint" id="st-size-hint"></div>
        </div>
        <div class="ale-field">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
            <label style="margin-bottom:0;">Quantity</label>
            <button id="st-custom-toggle" style="background:#f5f5f5;border:1.5px solid #e0e0e0;border-radius:8px;color:#999;font-family:'Poppins',sans-serif;font-size:10.5px;font-weight:600;padding:5px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background 0.15s,border-color 0.15s,color 0.15s;letter-spacing:0.02em;">Custom</button>
          </div>
          <div id="st-qty-wrap" class="ale-select-wrap"><select id="st-qty" class="ale-select" disabled><option value="">\u2014 Select quantity \u2014</option></select></div>
          <div id="st-custom-inputs" style="display:none;gap:8px;align-items:center;" class="ale-inline-row">
            <div style="flex:1;position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:600;color:#ccc;pointer-events:none;letter-spacing:0.04em;text-transform:uppercase;">QTY</span><input type="number" id="st-custom-qty" class="ale-input" style="padding-left:38px;" placeholder="750" min="1" step="1" /></div>
            <div style="flex:1;position:relative;"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:10px;font-weight:600;color:#ccc;pointer-events:none;letter-spacing:0.04em;text-transform:uppercase;">$</span><input type="number" id="st-custom-price" class="ale-input" style="padding-left:28px;" placeholder="320.00" min="0" step="0.01" /></div>
          </div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row"><label class="ale-artwork-toggle"><input type="checkbox" id="st-art-check" /><span>Artwork &amp; Setup</span></label><div class="ale-artwork-input-wrap"><input type="number" id="st-art-val" class="ale-input" placeholder="0.00" min="0" step="0.01" disabled /></div></div>
          <div class="ale-hint" id="st-art-range" style="text-align:right;margin-top:4px;">Select a product to see artwork range</div>
        </div>
        <div class="ale-divider"></div>
        <div id="st-result-wrap"><div class="ale-no-result">Select product &amp; quantity to calculate</div></div>
      </div>
      <div style="display:flex;justify-content:flex-end;padding:8px 18px 4px;"><button id="st-add-btn" style="background:#fff0f0;border:1.5px solid #DA0C0C;border-radius:8px;color:#DA0C0C;font-family:'Poppins',sans-serif;font-size:10.5px;font-weight:600;padding:5px 11px;cursor:pointer;transition:background 0.15s,transform 0.12s;letter-spacing:0.02em;">+ Add Product</button></div>
      <div class="ale-footer">ALE Stationery \u00b7 2026 Pricing Guide</div>`;
    let stModal=document.getElementById('st-modal-root');
    if(!stModal){stModal=document.createElement('div');stModal.id='st-modal-root';document.body.appendChild(stModal);}
    wireHeader();
    let stCustomMode=false;
    const stProd=()=>gid('st-product'),stQty=()=>gid('st-qty'),stQtyWrap=()=>gid('st-qty-wrap'),stCustomIn=()=>gid('st-custom-inputs'),stToggle=()=>gid('st-custom-toggle');
    function stUpdateProduct(key){const P=statGetAll(),delBtn=gid('st-delete-btn');delBtn.style.display=(key&&loadStatCustom()[key])?'block':'none';if(delBtn.style.display==='block'){delBtn.onmouseover=()=>delBtn.style.color='#DA0C0C';delBtn.onmouseout=()=>delBtn.style.color='#ccc';}gid('st-size-hint').textContent='';gid('st-art-range').textContent='Select a product to see artwork range';const qtyEl=stQty();qtyEl.innerHTML='<option value="">\u2014 Select quantity \u2014</option>';qtyEl.disabled=!key;if(key&&P[key]){const prod=P[key];if(prod.size)gid('st-size-hint').textContent=prod.size;if(prod.artMin!=null){gid('st-art-range').textContent='Artwork & Setup: $'+prod.artMin.toFixed(2)+' \u2013 $'+prod.artMax.toFixed(2);}else{gid('st-art-range').textContent='No artwork range set';}Object.keys(prod.qtys).sort((a,b)=>a-b).forEach(q=>{const o=document.createElement('option');o.value=q;o.textContent=parseInt(q).toLocaleString()+' \u2014 $'+parseFloat(prod.qtys[q]).toFixed(2);qtyEl.appendChild(o);});}stCalc();}
    function stCalc(){const wrap=gid('st-result-wrap');if(!wrap)return;const key=stProd().value,artChecked=gid('st-art-check').checked,artVal=parseFloat(gid('st-art-val').value)||0,isCustom=stCustomIn().style.display!=='none',P=statGetAll();let qty,basePrice;if(isCustom){qty=gid('st-custom-qty').value.trim();basePrice=parseFloat(gid('st-custom-price').value)||null;}else{qty=stQty().value;basePrice=(qty&&key&&P[key])?parseFloat(P[key].qtys[qty]):null;}if(!key||!qty||basePrice===null||isNaN(basePrice)){wrap.innerHTML='<div class="ale-no-result">Select product &amp; quantity to calculate</div>';return;}const artCost=artChecked?artVal:0,total=basePrice+artCost;const clipLines=[key,'QTY '+parseInt(qty).toLocaleString()+' \u2014 $'+basePrice.toFixed(2)+' inc. GST',...(artChecked&&artCost>0?['Artwork & Setup \u2014 $'+artCost.toFixed(2)+' inc. GST']:[])];const clipText=clipLines.join('\n');let subText=key+' \u00d7 '+parseInt(qty).toLocaleString();if(artChecked&&artCost>0)subText+=' + artwork';wrap.innerHTML='<div class="ale-result" style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;"><div><div class="ale-result-label">Total inc. GST</div><div class="ale-result-amount">$'+total.toFixed(2)+'</div><div style="font-size:9.5px;color:#bbb;margin-top:3px;">'+subText+'</div></div>'+actionsHTML('st-copy-btn','st-add-btn')+'</div>';wireActions('st-copy-btn','st-add-btn',clipText,total,key);}
    stProd().addEventListener('change',function(){stCustomMode=false;stToggle().style.cssText='background:#f5f5f5;border:1.5px solid #e0e0e0;border-radius:8px;color:#999;font-family:Poppins,sans-serif;font-size:10.5px;font-weight:600;padding:5px 10px;cursor:pointer;white-space:nowrap;flex-shrink:0;letter-spacing:0.02em;';stQtyWrap().style.display='';stCustomIn().style.display='none';gid('st-custom-qty').value='';gid('st-custom-price').value='';stUpdateProduct(this.value);});
    stToggle().addEventListener('click',()=>{stCustomMode=!stCustomMode;const t=stToggle();if(stCustomMode){t.style.background='#DA0C0C';t.style.borderColor='#DA0C0C';t.style.color='#fff';stQtyWrap().style.display='none';stCustomIn().style.display='flex';}else{t.style.background='#f5f5f5';t.style.borderColor='#e0e0e0';t.style.color='#999';stQtyWrap().style.display='';stCustomIn().style.display='none';}stQty().value='';gid('st-custom-qty').value='';gid('st-custom-price').value='';stCalc();});
    stQty().addEventListener('change',stCalc); gid('st-custom-qty').addEventListener('input',stCalc); gid('st-custom-price').addEventListener('input',stCalc);
    gid('st-art-check').addEventListener('change',function(){gid('st-art-val').disabled=!this.checked;if(!this.checked)gid('st-art-val').value='';stCalc();}); gid('st-art-val').addEventListener('input',stCalc);
    gid('st-delete-btn').addEventListener('click',()=>{const key=stProd().value,custom=loadStatCustom();if(key&&custom[key]){if(confirm('Remove custom product "'+key+'"?')){delete custom[key];saveStatCustom(custom);buildStationeryModule();}}});
    gid('st-add-btn').addEventListener('click',()=>openStatModal(stModal));
  }

  function openStatModal(root) {
    root.innerHTML='<div style="position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;" id="st-overlay"><div style="background:#fff;border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,0.22);width:100%;max-width:420px;max-height:90vh;overflow-y:auto;font-family:\'Poppins\',sans-serif;color:#1a1a1a;"><div style="padding:17px 20px 13px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;"><h3 style="margin:0;font-size:13.5px;font-weight:700;color:#DA0C0C;letter-spacing:0.05em;text-transform:uppercase;">Add New Product</h3><button id="stm-close" style="background:none;border:none;font-size:19px;color:#ccc;cursor:pointer;line-height:1;padding:0 2px;">\u2715</button></div><div style="padding:17px 20px;display:flex;flex-direction:column;gap:14px;"><div><label style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:5px;">Product Title</label><input type="text" id="stm-title" class="ale-input" style="padding:8px 11px;" placeholder="e.g. Folded Business Cards" /></div><div><label style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:5px;">Size / Description</label><input type="text" id="stm-size" class="ale-input" style="padding:8px 11px;" placeholder="e.g. 90mm \u00d7 54mm folded" /></div><div><label style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:5px;">Quantity Tiers &amp; Prices (inc. GST)</label><div id="stm-rows" style="display:flex;flex-direction:column;gap:7px;"></div><button id="stm-add-row" style="background:none;border:1.5px dashed #e0e0e0;border-radius:8px;color:#bbb;font-family:\'Poppins\',sans-serif;font-size:11px;font-weight:600;padding:7px;cursor:pointer;width:100%;margin-top:6px;">+ Add Quantity Tier</button></div><div><label style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:5px;">Artwork &amp; Setup Range</label><div style="display:flex;gap:8px;align-items:center;"><input type="number" id="stm-art-min" class="ale-input" style="flex:1;padding:7px 10px;font-size:12.5px;" placeholder="Min e.g. 50" min="0" step="0.01" /><span style="font-size:11px;color:#bbb;font-weight:500;flex-shrink:0;">to</span><input type="number" id="stm-art-max" class="ale-input" style="flex:1;padding:7px 10px;font-size:12.5px;" placeholder="Max e.g. 90" min="0" step="0.01" /></div><div style="font-size:10px;color:#ccc;margin-top:3px;">Leave blank if no artwork fee applies</div></div></div><div id="stm-error" style="font-size:11px;color:#DA0C0C;font-weight:500;padding:0 20px 10px;display:none;"></div><div style="padding:13px 20px 17px;display:flex;gap:10px;justify-content:flex-end;border-top:1px solid #f0f0f0;"><button id="stm-cancel" style="background:#f5f5f5;border:none;border-radius:9px;color:#888;font-family:\'Poppins\',sans-serif;font-size:12px;font-weight:600;padding:9px 18px;cursor:pointer;">Cancel</button><button id="stm-save" style="background:#DA0C0C;border:none;border-radius:9px;color:#fff;font-family:\'Poppins\',sans-serif;font-size:12px;font-weight:700;padding:9px 22px;cursor:pointer;letter-spacing:0.03em;box-shadow:0 2px 10px rgba(218,12,12,0.3);">Save Product</button></div></div></div>';
    function closeStatModal(){root.innerHTML='';}
    function addStatRow(){const rows=gid('stm-rows'),row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;';row.innerHTML='<span style="font-size:10px;color:#bbb;width:28px;text-align:right;font-weight:500;flex-shrink:0;">Qty</span><input type="number" class="ale-input stm-qq" style="flex:1;padding:7px 10px;font-size:12.5px;" placeholder="500" min="1" step="1" /><span style="font-size:10px;color:#bbb;width:12px;text-align:right;font-weight:500;flex-shrink:0;">$</span><input type="number" class="ale-input stm-pp" style="flex:1;padding:7px 10px;font-size:12.5px;" placeholder="200.00" min="0" step="0.01" /><button class="stm-rm" style="background:none;border:none;color:#ddd;font-size:15px;cursor:pointer;padding:0 2px;line-height:1;flex-shrink:0;">\u2715</button>';row.querySelector('.stm-rm').addEventListener('click',()=>row.remove());rows.appendChild(row);row.querySelector('.stm-qq').focus();}
    addStatRow();
    gid('stm-add-row').addEventListener('click',addStatRow); gid('stm-close').addEventListener('click',closeStatModal); gid('stm-cancel').addEventListener('click',closeStatModal);
    gid('st-overlay').addEventListener('click',e=>{if(e.target.id==='st-overlay')closeStatModal();});
    gid('stm-save').addEventListener('click',()=>{const title=gid('stm-title').value.trim(),size=gid('stm-size').value.trim(),artMinV=gid('stm-art-min').value.trim(),artMaxV=gid('stm-art-max').value.trim(),errEl=gid('stm-error');errEl.style.display='none';if(!title){errEl.textContent='Please enter a product title.';errEl.style.display='block';return;}const qtys={};let bad=false;document.querySelectorAll('#stm-rows > div').forEach(row=>{const q=row.querySelector('.stm-qq').value.trim(),p=row.querySelector('.stm-pp').value.trim();if(q||p){const qn=parseInt(q),pn=parseFloat(p);if(isNaN(qn)||isNaN(pn)||qn<=0||pn<0){bad=true;return;}qtys[qn]=pn;}});if(bad){errEl.textContent='One or more rows have invalid values.';errEl.style.display='block';return;}if(!Object.keys(qtys).length){errEl.textContent='Please add at least one quantity tier.';errEl.style.display='block';return;}const artMin=artMinV!==''?parseFloat(artMinV):null,artMax=artMaxV!==''?parseFloat(artMaxV):null;const custom=loadStatCustom();custom[title]={size,qtys,artMin,artMax};saveStatCustom(custom);closeStatModal();buildStationeryModule();});
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: STUBBY COOLERS
  // ════════════════════════════════════════════════════════════════════════════
  function buildStubbyModule() {
    panel.innerHTML=`
      ${moduleHeader('Stubby Coolers','6mm thick \u00b7 overlocked edges \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="sb-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="sb-qty" class="ale-input" placeholder="e.g. 100" min="10" step="1" /><div class="ale-hint" id="sb-qty-hint">Minimum order: 10</div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row"><label class="ale-artwork-toggle"><input type="checkbox" id="sb-art-check" /><span>Artwork &amp; Setup</span></label><div class="ale-artwork-input-wrap"><input type="number" id="sb-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div></div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field" style="background:#fafafa;border:1.5px solid #ebebeb;border-radius:9px;padding:10px 12px;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:8px;">Price Tiers (per unit)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;">
            ${STUBBY.TIERS.map(t=>`<div style="font-size:10.5px;color:#888;font-weight:500;">${t.minQty}${t.maxQty?'\u2013'+t.maxQty:'+'}</div><div style="font-size:10.5px;color:#1a1a1a;font-weight:600;text-align:right;">$${t.rate.toFixed(2)}/ea</div>`).join('')}
          </div>
        </div>
        <div id="sb-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Stubby Coolers \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('sb-art-check').addEventListener('change',function(){gid('sb-art-val').disabled=!this.checked;if(!this.checked)gid('sb-art-val').value='';stubbyCalc();});
    ['sb-desc','sb-qty','sb-art-val'].forEach(id=>gid(id).addEventListener('input',stubbyCalc));
    stubbyCalc();
  }

  function stubbyCalc() {
    const wrap=gid('sb-result-wrap'); if(!wrap)return;
    const qty=parseInt(gid('sb-qty').value)||0,desc=gid('sb-desc').value.trim(),artChecked=gid('sb-art-check').checked,artVal=artChecked?(parseFloat(gid('sb-art-val').value)||0):0,hintEl=gid('sb-qty-hint');
    if(!qty||qty<10){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate (min. 10)</div>';if(hintEl)hintEl.textContent='Minimum order: 10';return;}
    const tier=STUBBY.TIERS.slice().reverse().find(t=>qty>=t.minQty),rateEach=tier.rate,unitCost=rateEach*qty,total=applyMinAndRound(unitCost+artVal);
    const currentIdx=STUBBY.TIERS.indexOf(tier),nextTier=STUBBY.TIERS[currentIdx+1];
    if(hintEl)hintEl.textContent=nextTier?'Next price break at '+nextTier.minQty+'+ \u2014 $'+nextTier.rate.toFixed(2)+'/ea':'Best available rate';
    const clipText=['Stubby Coolers',...(desc?[desc]:[]),'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div><div class="ale-result-breakdown"><span><span>${qty} \u00d7 $${rateEach.toFixed(2)}/ea</span><b>$${unitCost.toFixed(2)}</b></span>${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}<span><span>Per cooler (after rounding)</span><b>$${(total/qty).toFixed(2)}</b></span><span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span></div><div class="ale-result-clip">${clipText}</div>${actionsHTML("sb-copy-btn","sb-add-btn")}</div>`;
    wireActions('sb-copy-btn','sb-add-btn',clipText,total,clipText.split('\\n')[0]);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: BAR MATS
  // ════════════════════════════════════════════════════════════════════════════
  function buildBarMatsModule() {
    panel.innerHTML=`
      ${moduleHeader('Bar Mats','6mm thick \u00b7 overlocked edges \u00b7 inc. GST')}
      <div class="ale-body">
        <div class="ale-field"><label>Job Description</label><input type="text" id="bm-desc" class="ale-input" placeholder="Description\u2026" /></div>
        <div class="ale-field"><label>Quantity</label><input type="number" id="bm-qty" class="ale-input" placeholder="e.g. 25" min="1" step="1" /><div class="ale-hint" id="bm-qty-hint"></div></div>
        <div class="ale-divider"></div>
        <div class="ale-field">
          <div class="ale-artwork-row"><label class="ale-artwork-toggle"><input type="checkbox" id="bm-art-check" /><span>Artwork &amp; Setup</span></label><div class="ale-artwork-input-wrap"><input type="number" id="bm-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled /></div></div>
          <div class="ale-hint" style="text-align:right;">Range: $50 \u2013 $100</div>
        </div>
        <div class="ale-divider"></div>
        <div class="ale-field" style="background:#fafafa;border:1.5px solid #ebebeb;border-radius:9px;padding:10px 12px;">
          <div style="font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:8px;">Price Tiers (per unit)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;">
            ${BARMATS.TIERS.map(t=>`<div style="font-size:10.5px;color:#888;font-weight:500;">${t.minQty}${t.maxQty?'\u2013'+t.maxQty:'+'}</div><div style="font-size:10.5px;color:#1a1a1a;font-weight:600;text-align:right;">$${t.rate.toFixed(2)}/ea</div>`).join('')}
          </div>
        </div>
        <div id="bm-result-wrap"><div class="ale-no-result">Enter quantity to calculate</div></div>
      </div>
      <div class="ale-footer">ALE Bar Mats \u00b7 2026 Pricing</div>`;
    wireHeader();
    gid('bm-art-check').addEventListener('change',function(){gid('bm-art-val').disabled=!this.checked;if(!this.checked)gid('bm-art-val').value='';barMatsCalc();});
    ['bm-desc','bm-qty','bm-art-val'].forEach(id=>gid(id).addEventListener('input',barMatsCalc));
    barMatsCalc();
  }

  function barMatsCalc() {
    const wrap=gid('bm-result-wrap'); if(!wrap)return;
    const qty=parseInt(gid('bm-qty').value)||0,desc=gid('bm-desc').value.trim(),artChecked=gid('bm-art-check').checked,artVal=artChecked?(parseFloat(gid('bm-art-val').value)||0):0,hintEl=gid('bm-qty-hint');
    if(!qty||qty<1){wrap.innerHTML='<div class="ale-no-result">Enter quantity to calculate</div>';if(hintEl)hintEl.textContent='';return;}
    const tier=BARMATS.TIERS.slice().reverse().find(t=>qty>=t.minQty),rateEach=tier.rate,unitCost=rateEach*qty,total=applyMinAndRound(unitCost+artVal);
    const currentIdx=BARMATS.TIERS.indexOf(tier),nextTier=BARMATS.TIERS[currentIdx+1];
    if(hintEl)hintEl.textContent=nextTier?'Next price break at '+nextTier.minQty+'+ \u2014 $'+nextTier.rate.toFixed(2)+'/ea':'Best available rate';
    const clipText=['Bar Mats',...(desc?[desc]:[]),'Qty '+qty+' @ $'+total.toFixed(2)+' inc. GST'].join('\n');
    wrap.innerHTML=`<div class="ale-result"><div class="ale-result-label">Estimated Total</div><div class="ale-result-amount">$${total.toFixed(2)}</div><div class="ale-result-breakdown"><span><span>${qty} \u00d7 $${rateEach.toFixed(2)}/ea</span><b>$${unitCost.toFixed(2)}</b></span>${artChecked&&artVal>0?`<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>`:''}<span><span>Per mat (after rounding)</span><b>$${(total/qty).toFixed(2)}</b></span><span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span></div><div class="ale-result-clip">${clipText}</div>${actionsHTML("bm-copy-btn","bm-add-btn")}</div>`;
    wireActions('bm-copy-btn','bm-add-btn',clipText,total,clipText.split('\\n')[0]);
  }


  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: FENCE MESH
  // ════════════════════════════════════════════════════════════════════════════
  function buildFenceMeshModule() {
    panel.innerHTML = moduleHeader('Fence Mesh', 'Fence mesh quoting · inc. GST') + `
      <div class="ale-body">

        <div class="ale-field">
          <label>Job Description</label>
          <input type="text" id="fm-desc" class="ale-input" placeholder="Description…" />
        </div>

        <div class="ale-field">
          <label>Type</label>
          <div class="ale-select-wrap">
            <select id="fm-type" class="ale-select">
              <option value="roll">Fence Mesh Roll</option>
              <option value="panel">Fence Mesh Panel</option>
            </select>
          </div>
        </div>

        <div class="ale-field" id="fm-roll-field">
          <label>Roll Size</label>
          <div class="ale-select-wrap">
            <select id="fm-roll-size" class="ale-select">
              ${FENCEMESH.ROLLS.map(r => `<option value="${r.rate}">${r.label} — $${r.rate.toLocaleString()}</option>`).join('')}
            </select>
          </div>
          <div class="ale-hint">Price is per full roll inc. GST</div>
        </div>

        <div class="ale-field" id="fm-panel-field" style="display:none;">
          <label>Panel Size</label>
          <div class="ale-select-wrap">
            <select id="fm-panel-size" class="ale-select">
              ${FENCEMESH.PANELS.map(p => `<option value="${p.rate}">${p.label} — $${p.rate}/panel</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="ale-field">
          <label id="fm-qty-label">Quantity</label>
          <input type="number" id="fm-qty" class="ale-input" placeholder="1" min="1" step="1" />
          <div class="ale-hint" id="fm-qty-hint"></div>
        </div>

        <div class="ale-divider"></div>

        <div class="ale-field">
          <div class="ale-artwork-row">
            <label class="ale-artwork-toggle">
              <input type="checkbox" id="fm-art-check" />
              <span>Artwork &amp; Setup</span>
            </label>
            <div class="ale-artwork-input-wrap">
              <input type="number" id="fm-art-val" class="ale-input" placeholder="0.00" min="50" max="100" step="1" disabled />
            </div>
          </div>
          <div class="ale-hint" style="text-align:right;">Range: $50 – $100</div>
        </div>

        <div class="ale-divider"></div>

        <div id="fm-result-wrap">
          <div class="ale-no-result">Enter quantity to calculate</div>
        </div>

      </div>
      <div class="ale-footer">ALE Fence Mesh · 2026 Pricing</div>`;

    wireHeader();

    function updateTypeFields() {
      const isRoll = gid('fm-type').value === 'roll';
      gid('fm-roll-field').style.display  = isRoll ? '' : 'none';
      gid('fm-panel-field').style.display = isRoll ? 'none' : '';
      gid('fm-qty-label').textContent     = isRoll ? 'Quantity (rolls)' : 'Quantity (panels)';
      gid('fm-qty').min                   = isRoll ? '1' : '3';
      gid('fm-qty').placeholder           = isRoll ? '1' : '3';
      gid('fm-qty').value                 = '';
      gid('fm-qty-hint').textContent      = isRoll ? '' : 'Minimum order: 3 panels';
      fenceMeshCalc();
    }

    gid('fm-type').addEventListener('change', updateTypeFields);
    gid('fm-art-check').addEventListener('change', function() {
      gid('fm-art-val').disabled = !this.checked;
      if (!this.checked) gid('fm-art-val').value = '';
      fenceMeshCalc();
    });
    ['fm-desc','fm-qty','fm-art-val'].forEach(id => gid(id).addEventListener('input', fenceMeshCalc));
    ['fm-roll-size','fm-panel-size'].forEach(id => gid(id).addEventListener('change', fenceMeshCalc));
    updateTypeFields();
  }

  function fenceMeshCalc() {
    const wrap = gid('fm-result-wrap'); if (!wrap) return;

    const isRoll     = gid('fm-type').value === 'roll';
    const qty        = parseInt(gid('fm-qty').value) || 0;
    const desc       = gid('fm-desc').value.trim();
    const artChecked = gid('fm-art-check').checked;
    const artVal     = artChecked ? (parseFloat(gid('fm-art-val').value) || 0) : 0;
    const hintEl     = gid('fm-qty-hint');

    if (isRoll) {
      const rate       = parseFloat(gid('fm-roll-size').value);
      const sizeSelect = gid('fm-roll-size');
      const sizeLabel  = sizeSelect.options[sizeSelect.selectedIndex].text.split(' —')[0].trim();

      if (!qty || qty < 1) {
        wrap.innerHTML = '<div class="ale-no-result">Enter quantity to calculate</div>';
        if (hintEl) hintEl.textContent = '';
        return;
      }

      const unitCost = rate * qty;
      const total    = applyMinAndRound(unitCost + artVal);
      const clipText = [
        'Fence Mesh Roll — ' + sizeLabel,
        ...(desc ? [desc] : []),
        'Qty ' + qty + ' roll' + (qty !== 1 ? 's' : '') + ' @ $' + total.toFixed(2) + ' inc. GST',
      ].join('\n');

      wrap.innerHTML = `
        <div class="ale-result">
          <div class="ale-result-label">Estimated Total</div>
          <div class="ale-result-amount">$${total.toFixed(2)}</div>
          <div class="ale-result-breakdown">
            <span><span>${qty} × ${sizeLabel}</span><b>$${unitCost.toFixed(2)}</b></span>
            ${artChecked && artVal > 0 ? `<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>` : ''}
            <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
          </div>
          <div class="ale-result-clip">${clipText}</div>
          ${actionsHTML("fm-copy-btn","fm-add-btn")}
        </div>`;
      wireActions('fm-copy-btn','fm-add-btn',clipText,total,clipText.split('\\n')[0]);

    } else {
      const rate       = parseFloat(gid('fm-panel-size').value);
      const sizeSelect = gid('fm-panel-size');
      const sizeLabel  = sizeSelect.options[sizeSelect.selectedIndex].text.split(' —')[0].trim();

      if (!qty || qty < 3) {
        wrap.innerHTML = '<div class="ale-no-result">Enter quantity to calculate (min. 3 panels)</div>';
        if (hintEl) hintEl.textContent = 'Minimum order: 3 panels';
        return;
      }
      if (hintEl) hintEl.textContent = '';

      const unitCost = rate * qty;
      const total    = applyMinAndRound(unitCost + artVal);
      const perPanel = total / qty;
      const clipText = [
        'Fence Mesh Panel — ' + sizeLabel,
        ...(desc ? [desc] : []),
        'Qty ' + qty + ' @ $' + total.toFixed(2) + ' inc. GST',
      ].join('\n');

      wrap.innerHTML = `
        <div class="ale-result">
          <div class="ale-result-label">Estimated Total</div>
          <div class="ale-result-amount">$${total.toFixed(2)}</div>
          <div class="ale-result-breakdown">
            <span><span>${qty} × ${sizeLabel} @ $${rate.toFixed(2)}/panel</span><b>$${unitCost.toFixed(2)}</b></span>
            ${artChecked && artVal > 0 ? `<span><span>Artwork &amp; Setup</span><b>$${artVal.toFixed(2)}</b></span>` : ''}
            <span><span>Per panel (after rounding)</span><b>$${perPanel.toFixed(2)}</b></span>
            <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
          </div>
          <div class="ale-result-clip">${clipText}</div>
          ${actionsHTML("fm-copy-btn","fm-add-btn")}
        </div>`;
      wireActions('fm-copy-btn','fm-add-btn',clipText,total,clipText.split('\\n')[0]);
    }

  }


  // ════════════════════════════════════════════════════════════════════════════
  // MODULE: BANNERS
  // ════════════════════════════════════════════════════════════════════════════
  function buildBannersModule() {
    panel.innerHTML = moduleHeader('Banners', 'Banner quoting \u00b7 inc. GST') + `
      <div class="ale-body">

        <div class="ale-field">
          <label>Job Description</label>
          <input type="text" id="bn-desc" class="ale-input" placeholder="Description\u2026" />
        </div>

        <div class="ale-field">
          <label>Banner Size / Preset</label>
          <div class="ale-select-wrap">
            <select id="bn-preset" class="ale-select">
              <option value="custom">Custom Banner</option>
              ${BANNERS.PRESETS.map((p, i) => `<option value="${i}">${p.label} \u2014 $${p.flatRate}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="bn-custom-fields">

          <div class="ale-field">
            <label>Banner Size</label>
            <div class="ale-three-col">
              <div class="ale-input-wrap">
                <input type="number" id="bn-w" class="ale-input" placeholder="Width" min="1" step="1" />
                <span class="ale-input-unit">mm</span>
              </div>
              <span class="ale-three-col-sep">\u00d7</span>
              <div class="ale-input-wrap">
                <input type="number" id="bn-h" class="ale-input" placeholder="Height" min="1" step="1" />
                <span class="ale-input-unit">mm</span>
              </div>
            </div>
            <div class="ale-hint" id="bn-sqm-hint"></div>
          </div>

          <div class="ale-field">
            <label>Banner Type</label>
            <div class="ale-select-wrap">
              <select id="bn-type" class="ale-select">
                <option value="standard">Standard (no additional cost)</option>
                <option value="blockout">Blockout Banner 550gsm \u2014 +$125/m\u00b2</option>
                <option value="backlit">Back Lit Banner \u2014 +$185/m\u00b2</option>
              </select>
            </div>
          </div>

          <div class="ale-field">
            <label>Print Method</label>
            <div class="ale-select-wrap">
              <select id="bn-print" class="ale-select">
                <option value="digital">Digitally Printed \u2014 $${BANNERS.PRINT_RATE}/m\u00b2</option>
                <option value="laminate">Digital + Liquid Laminate \u2014 $${BANNERS.PRINT_RATE + BANNERS.LAMINATE_RATE}/m\u00b2</option>
                <option value="vinyl">Vinyl</option>
              </select>
            </div>
          </div>

          <div class="ale-field">
            <label>Mounting Method</label>
            <div class="ale-select-wrap">
              <select id="bn-mount" class="ale-select">
                <option value="none">None</option>
                <option value="hem">Hem (no additional cost)</option>
                <option value="hem_eyelet">Hem + Eyelet</option>
                <option value="rope_eyelet">Rope + Eyelet</option>
                <option value="rope">Rope Only</option>
                <option value="keder">Keder Only</option>
                <option value="keder_sail">Keder + Sailtrack</option>
              </select>
            </div>
          </div>

          <div class="ale-field" id="bn-eyelet-field" style="display:none;">
            <label>Number of Eyelets</label>
            <input type="number" id="bn-eyelets" class="ale-input" placeholder="e.g. 10" min="1" step="1" />
            <div class="ale-hint">$${BANNERS.EYELET_RATE.toFixed(2)} per eyelet</div>
          </div>

        </div>

        <div class="ale-divider"></div>

        <div class="ale-field">
          <label>Quantity</label>
          <input type="number" id="bn-qty" class="ale-input" placeholder="1" min="1" step="1" />
        </div>

        <div class="ale-divider"></div>

        <div id="bn-result-wrap">
          <div class="ale-no-result">Select a preset or enter custom dimensions</div>
        </div>

      </div>
      <div class="ale-footer">ALE Banners \u00b7 2026 Pricing</div>`;

    wireHeader();

    function updatePreset() {
      const isCustom = gid('bn-preset').value === 'custom';
      gid('bn-custom-fields').style.display = isCustom ? '' : 'none';
      bannersCalc();
    }

    function updateMountFields() {
      const mount = gid('bn-mount').value;
      const needsEyelets = mount === 'hem_eyelet' || mount === 'rope_eyelet';
      gid('bn-eyelet-field').style.display = needsEyelets ? '' : 'none';
      if (!needsEyelets) gid('bn-eyelets').value = '';
      bannersCalc();
    }

    gid('bn-preset').addEventListener('change', updatePreset);
    gid('bn-mount').addEventListener('change', updateMountFields);
    ['bn-desc','bn-w','bn-h','bn-eyelets','bn-qty'].forEach(id => gid(id).addEventListener('input', bannersCalc));
    ['bn-type','bn-print','bn-mount'].forEach(id => gid(id).addEventListener('change', bannersCalc));

    updatePreset();
  }

  function bannersCalc() {
    const wrap = gid('bn-result-wrap'); if (!wrap) return;

    const presetVal = gid('bn-preset').value;
    const isCustom  = presetVal === 'custom';
    const qty       = parseInt(gid('bn-qty').value) || 0;
    const desc      = gid('bn-desc').value.trim();

    if (!qty || qty < 1) {
      wrap.innerHTML = '<div class="ale-no-result">Enter quantity to calculate</div>';
      return;
    }

    // ── PRESET PATH ──────────────────────────────────────────────────────────
    if (!isCustom) {
      const preset   = BANNERS.PRESETS[parseInt(presetVal)];
      const total    = applyMinAndRound(preset.flatRate * qty);
      const clipText = [
        preset.label,
        ...(desc ? [desc] : []),
        'Qty ' + qty + ' @ $' + total.toFixed(2) + ' inc. GST',
      ].join('\n');

      wrap.innerHTML = `
        <div class="ale-result">
          <div class="ale-result-label">Estimated Total</div>
          <div class="ale-result-amount">$${total.toFixed(2)}</div>
          <div class="ale-result-breakdown">
            <span><span>${qty} \u00d7 ${preset.label.split(' \u2014')[0]} @ $${preset.flatRate}</span><b>$${(preset.flatRate * qty).toFixed(2)}</b></span>
            ${qty > 1 ? `<span><span>Per banner</span><b>$${(total / qty).toFixed(2)}</b></span>` : ''}
            <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
          </div>
          <div class="ale-result-clip">${clipText}</div>
          ${actionsHTML("bn-copy-btn","bn-add-btn")}
        </div>`;
      wireActions('bn-copy-btn','bn-add-btn',clipText,total,clipText.split('\\n')[0]);
      return;
    }

    // ── CUSTOM PATH ──────────────────────────────────────────────────────────
    const wMM    = parseFloat(gid('bn-w').value);
    const hMM    = parseFloat(gid('bn-h').value);
    const hintEl = gid('bn-sqm-hint');
    const mount  = gid('bn-mount').value;
    const print  = gid('bn-print').value;

    if (!wMM || !hMM) {
      wrap.innerHTML = '<div class="ale-no-result">Enter dimensions &amp; quantity to calculate</div>';
      if (hintEl) hintEl.textContent = '';
      return;
    }

    const wM  = wMM / 1000;
    const hM  = hMM / 1000;
    const sqm = wM * hM;
    if (hintEl) hintEl.textContent = sqm.toFixed(3) + ' m\u00b2';

    const type          = gid('bn-type').value;
    const typeSurcharge = BANNERS.TYPE_RATES[type] || 0;
    const printRate     = (print === 'laminate'
      ? BANNERS.PRINT_RATE + BANNERS.LAMINATE_RATE
      : BANNERS.PRINT_RATE) + typeSurcharge;
    const printCost = sqm * printRate;

    let mountCost = 0, mountLabel = '', mountBreakdown = '';
    const eyelets = parseInt(gid('bn-eyelets').value) || 0;
    const perim   = 2 * (wM + hM);

    switch (mount) {
      case 'none':        mountLabel = 'No mounting'; break;
      case 'hem':         mountLabel = 'Hem'; break;
      case 'hem_eyelet': {
        mountCost      = eyelets * BANNERS.EYELET_RATE;
        mountLabel     = 'Hem + Eyelet';
        mountBreakdown = eyelets > 0 ? eyelets + ' eyelets @ $' + BANNERS.EYELET_RATE.toFixed(2) : '';
        break;
      }
      case 'rope_eyelet': {
        const ropeLenM = wM * 2;
        mountCost      = BANNERS.ROPE_EXCESS + ropeLenM * BANNERS.ROPE_RATE + eyelets * BANNERS.EYELET_RATE;
        mountLabel     = 'Rope + Eyelet';
        mountBreakdown = '$' + BANNERS.ROPE_EXCESS + ' excess + ' + ropeLenM.toFixed(2) + 'm rope @ $' + BANNERS.ROPE_RATE + '/m' +
          (eyelets > 0 ? ' + ' + eyelets + ' eyelets @ $' + BANNERS.EYELET_RATE.toFixed(2) : '');
        break;
      }
      case 'rope': {
        const ropeLenM = wM * 2;
        mountCost      = BANNERS.ROPE_EXCESS + ropeLenM * BANNERS.ROPE_RATE;
        mountLabel     = 'Rope Only';
        mountBreakdown = '$' + BANNERS.ROPE_EXCESS + ' excess + ' + ropeLenM.toFixed(2) + 'm rope @ $' + BANNERS.ROPE_RATE + '/m';
        break;
      }
      case 'keder': {
        mountCost      = perim * BANNERS.KEDER_RATE;
        mountLabel     = 'Keder Only';
        mountBreakdown = perim.toFixed(2) + 'm keder @ $' + BANNERS.KEDER_RATE + '/m';
        break;
      }
      case 'keder_sail': {
        mountCost      = perim * BANNERS.KEDER_SAIL_RATE;
        mountLabel     = 'Keder + Sailtrack';
        mountBreakdown = perim.toFixed(2) + 'm @ $' + BANNERS.KEDER_SAIL_RATE + '/m';
        break;
      }
    }

    const total    = applyMinAndRound((printCost + mountCost) * qty);
    const typeLabel = type === 'backlit' ? 'Back Lit Banner' : type === 'blockout' ? 'Blockout Banner 550gsm' : 'Standard Banner';
    const printLabel = print === 'laminate' ? 'Digital + Liquid Laminate' : print === 'vinyl' ? 'Vinyl' : 'Digitally Printed';
    const sizeLabel  = wMM + 'mm \u00d7 ' + hMM + 'mm';

    const clipText = [
      typeLabel + ' \u2014 ' + printLabel,
      ...(desc ? [desc] : []),
      sizeLabel,
      mountLabel,
      'Qty ' + qty + ' @ $' + total.toFixed(2) + ' inc. GST',
    ].join('\n');

    wrap.innerHTML = `
      <div class="ale-result">
        <div class="ale-result-label">Estimated Total</div>
        <div class="ale-result-amount">$${total.toFixed(2)}</div>
        <div class="ale-result-breakdown">
          <span><span>Print \u2014 ${sqm.toFixed(3)}m\u00b2 @ $${printRate}/m\u00b2</span><b>$${(printCost * qty).toFixed(2)}</b></span>
          ${mountCost > 0 ? `<span><span>${mountLabel}${mountBreakdown ? ' (' + mountBreakdown + ')' : ''}</span><b>$${(mountCost * qty).toFixed(2)}</b></span>` : ''}
          ${qty > 1 ? `<span><span>Per banner</span><b>$${(total / qty).toFixed(2)}</b></span>` : ''}
          <span class="ale-bd-total"><span>Total inc. GST</span><span>$${total.toFixed(2)}</span></span>
        </div>
        <div class="ale-result-clip">${clipText}</div>
        ${actionsHTML("bn-copy-btn","bn-add-btn")}
      </div>`;
    wireActions('bn-copy-btn','bn-add-btn',clipText,total,clipText.split('\\n')[0]);
  }


  // ─── FAB ─────────────────────────────────────────────────────────────────────
  // ─── QUOTE PANEL ─────────────────────────────────────────────────────────
  function buildQuotePanel() {
    const q = aleQuote();
    const grandTotal = q.reduce((s, i) => s + i.total, 0);

    const itemsHTML = q.length === 0
      ? '<div class="ale-quote-empty">No items added yet. Use \"Add to List\" on any calculator result.</div>'
      : q.map((item, idx) => {
          const key = aleQuoteKey(item.clipText);
          return '<div class="ale-quote-item" id="qi-' + idx + '">' +
            '<div class="ale-quote-item-label">' + item.label + '</div>' +
            '<div class="ale-quote-item-total">$' + item.total.toFixed(2) + ' inc. GST</div>' +
            '<div class="ale-quote-item-actions">' +
              '<button class="ale-qi-btn" id="qi-copy-' + idx + '">Copy</button>' +
              '<button class="ale-qi-btn danger" id="qi-del-' + idx + '">Remove</button>' +
            '</div>' +
          '</div>';
        }).join('');

    quotePanel.innerHTML =
      '<div class="ale-header" style="position:sticky;top:0;z-index:10;">' +
        '<div><h2 style="color:#DA0C0C;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 1px;">Quote List</h2>' +
        '<p style="margin:0;font-size:10px;color:#bbb;">' + q.length + ' item' + (q.length !== 1 ? 's' : '') + '</p></div>' +
        '<div style="display:flex;gap:8px;align-items:center;">' +
          (q.length > 0 ? '<button class="ale-qi-btn danger" id="q-clear-btn" style="font-size:9.5px;">Clear All</button>' : '') +
          '<button class="ale-close-btn" id="ale-quote-close">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;">' + itemsHTML + '</div>' +
      (q.length > 0 ?
        '<div class="ale-quote-total-bar">' +
          '<div><div class="ale-quote-total-label">Estimated Total</div>' +
          '<div class="ale-quote-total-amount">$' + grandTotal.toFixed(2) + '</div></div>' +
          '<button class="ale-copy-btn" id="q-copy-all-btn" style="flex:none;padding:10px 16px;">Copy Quote</button>' +
        '</div>' : '');

    // Wire close
    gid('ale-quote-close').addEventListener('click', closeQuotePanel);

    // Wire clear all
    const clearBtn = gid('q-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        aleSaveQuote([]);
        updateQuoteBadge();
        buildQuotePanel();
      });
    }

    // Wire copy all
    const copyAllBtn = gid('q-copy-all-btn');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', () => {
        const q2 = aleQuote();
        const lines = q2.map((item, i) => (i + 1) + '. ' + item.clipText).join('\n\n');
        const fullText = 'QUOTE\n' + '='.repeat(30) + '\n\n' + lines + '\n\n' + '='.repeat(30) + '\nEstimated Total: $' + grandTotal.toFixed(2) + ' inc. GST';
        copyText(fullText);
        copyAllBtn.textContent = '✓ Copied!'; copyAllBtn.classList.add('copied');
        setTimeout(() => { copyAllBtn.textContent = 'Copy Quote'; copyAllBtn.classList.remove('copied'); }, 2000);
      });
    }

    // Wire per-item buttons
    q.forEach((item, idx) => {
      const copyBtn = gid('qi-copy-' + idx);
      const delBtn  = gid('qi-del-' + idx);
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          copyText(item.clipText);
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      }
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          const q2 = aleQuote();
          q2.splice(idx, 1);
          aleSaveQuote(q2);
          updateQuoteBadge();
          buildQuotePanel();
        });
      }
    });
  }

  // ─── FAB WIRING ───────────────────────────────────────────────────────────
  fab.addEventListener('click', () => {
    // Close quote panel if open
    closeQuotePanel();
    const open = panel.classList.toggle('visible');
    fab.classList.toggle('open', open);
    quoteFab.classList.toggle('visible', open);
    if (open) {
      // Only rebuild the menu if the panel is empty or showing the menu
      // If a module is loaded, restore it as-is so user doesn't lose their work
      if (!panel.innerHTML || panel.querySelector('#ale-hub-grid')) {
        buildMenu();
      }
    }
  });

  quoteFab.addEventListener('click', () => {
    // Close pricing panel if open
    closePanel();
    const open = quotePanel.classList.toggle('visible');
    quoteFab.classList.toggle('open', open);
    if (open) buildQuotePanel();
  });

  updateQuoteBadge();

})();
