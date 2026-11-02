import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('store_assets');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// Icon SVG as Base64 for embedding
const iconSvg = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <linearGradient id="innerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#1d4ed8" flood-opacity="0.45"/>
    </filter>
  </defs>
  <rect width="128" height="128" rx="28" fill="#0f172a"/>
  <g filter="url(#shadow)">
    <path d="M24 34 C24 22.95 32.95 14 44 14 L84 14 C95.05 14 104 22.95 104 34 L104 74 C104 85.05 95.05 94 84 94 L46 94 L28 108 L28 88 C25.5 84.5 24 79.5 24 74 Z" fill="url(#bgGrad)"/>
    <path d="M25 34 C25 23.5 33.5 15 44 15 L84 15 C94.5 15 103 23.5 103 34 L103 74 C103 84.5 94.5 93 84 93 L45.5 93 L29 106 L29 87.5 L25 82 Z" fill="url(#innerGlow)"/>
  </g>
  <path d="M46 32 L68 32 C77 32 83 37.5 83 46 C83 54.5 77 60 68 60 L58 60 L58 76 L46 76 Z M58 42 L58 50 L67 50 C71 50 73 48.5 73 46 C73 43.5 71 42 67 42 Z" fill="#ffffff"/>
  <circle cx="89" cy="27" r="4.5" fill="#facc15"/>
  <path d="M89 18 L89 36 M80 27 L98 27" stroke="#fef08a" stroke-width="2" stroke-linecap="round"/>
</svg>
`).toString('base64')}`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Generating Store Assets in store_assets/...');

  // ==========================================
  // 1. STORE ICON (128x128 PNG)
  // ==========================================
  console.log('1. Generating Store Icon (128x128)...');
  await page.setViewportSize({ width: 128, height: 128 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing: border-box; }
          body { width: 128px; height: 128px; background: #0f172a; display: flex; align-items: center; justify-content: center; }
          img { width: 128px; height: 128px; }
        </style>
      </head>
      <body>
        <img src="${iconSvg}" />
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(OUT_DIR, 'store_icon_128x128.png'), type: 'png' });

  // ==========================================
  // 2. SMALL PROMO TILE (440x280)
  // ==========================================
  console.log('2. Generating Small Promo Tile (440x280)...');
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body {
            width: 440px;
            height: 280px;
            background: linear-gradient(135deg, #0b0f19 0%, #111827 50%, #0f172a 100%);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .glow {
            position: absolute;
            width: 320px;
            height: 320px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%);
            top: -60px;
            left: 60px;
            pointer-events: none;
          }
          .icon-wrap {
            width: 68px;
            height: 68px;
            margin-bottom: 12px;
            filter: drop-shadow(0 8px 20px rgba(37, 99, 235, 0.5));
          }
          .icon-wrap img { width: 100%; height: 100%; }
          .title-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
          }
          .pro-badge {
            background: #2563eb;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            letter-spacing: 0.08em;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .subtitle {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 16px;
            font-weight: 500;
          }
          .chips {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            justify-content: center;
          }
          .chip {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 5px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        <div class="icon-wrap">
          <img src="${iconSvg}" />
        </div>
        <div class="title-row">
          <span class="pro-badge">PRO</span>
          <h1>ProText</h1>
        </div>
        <div class="subtitle">Power Tools for Google Messages™</div>
        <div class="chips">
          <span class="chip">🎨 OLED Themes</span>
          <span class="chip">📁 Smart Folders</span>
          <span class="chip">⏱️ Undo Send</span>
          <span class="chip">📢 Bulk Texting</span>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(OUT_DIR, 'small_promo_440x280.png'), type: 'png' });

  // ==========================================
  // 3. MARQUEE PROMO TILE (1400x560)
  // ==========================================
  console.log('3. Generating Marquee Promo Tile (1400x560)...');
  await page.setViewportSize({ width: 1400, height: 560 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin:0; padding:0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body {
            width: 1400px;
            height: 560px;
            background: linear-gradient(135deg, #090d16 0%, #0f172a 45%, #1e1b4b 100%);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 60px 80px;
            position: relative;
            overflow: hidden;
          }
          .bg-glow-1 {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(37, 99, 235, 0.28) 0%, transparent 65%);
            top: -150px;
            left: 200px;
          }
          .bg-glow-2 {
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(147, 51, 234, 0.22) 0%, transparent 65%);
            bottom: -150px;
            right: 150px;
          }
          .left-col {
            max-width: 650px;
            z-index: 2;
          }
          .badge-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
          }
          .brand-badge {
            background: linear-gradient(135deg, #2563eb, #06b6d4);
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          }
          .privacy-pill {
            background: rgba(16, 185, 129, 0.15);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
          }
          h1 {
            font-size: 48px;
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: -0.03em;
            margin-bottom: 16px;
            background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          p.lead {
            font-size: 18px;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 28px;
          }
          .feature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .feat-item {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            color: #cbd5e1;
            font-weight: 600;
          }
          .feat-icon {
            color: #38bdf8;
            font-size: 16px;
          }

          /* Right column card mockup */
          .right-col {
            z-index: 2;
            width: 520px;
            background: #18191c;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 20px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.25);
            overflow: hidden;
          }
          .mockup-header {
            background: #202124;
            padding: 14px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .mockup-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 700;
          }
          .pill-btn {
            background: #2563eb;
            color: white;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 10px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .mockup-tabs {
            display: flex;
            gap: 6px;
            padding: 12px 18px;
            background: #131314;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          }
          .mtab {
            font-size: 11px;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.06);
            color: #94a3b8;
          }
          .mtab.active {
            background: #2563eb;
            color: white;
          }
          .mockup-body {
            padding: 20px;
          }
          .chat-bubble-out {
            background: #2563eb;
            color: white;
            padding: 10px 14px;
            border-radius: 16px 16px 4px 16px;
            font-size: 13px;
            max-width: 80%;
            margin-left: auto;
            margin-bottom: 12px;
          }
          .undo-bar {
            background: #1e293b;
            border: 1px solid #3b82f6;
            border-radius: 12px;
            padding: 10px 14px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
          }
          .undo-btn {
            background: #ef4444;
            color: white;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 6px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="bg-glow-1"></div>
        <div class="bg-glow-2"></div>

        <div class="left-col">
          <div class="badge-row">
            <span class="brand-badge">PROTEXT</span>
            <span class="privacy-pill">🛡️ 100% Local & Private</span>
          </div>
          <h1>Supercharge Google Messages™</h1>
          <p class="lead">Personalized bulk texting, custom AMOLED dark themes, smart folder tabs, and an undo-send buffer directly in your browser.</p>

          <div class="feature-grid">
            <div class="feat-item"><span class="feat-icon">✦</span> Personalized Bulk Announcements</div>
            <div class="feat-item"><span class="feat-icon">✦</span> 12+ AMOLED & OLED Themes</div>
            <div class="feat-item"><span class="feat-icon">✦</span> Smart Tabs (Unread, Follow-Up)</div>
            <div class="feat-item"><span class="feat-icon">✦</span> 3-Second Undo Send Safety Buffer</div>
            <div class="feat-item"><span class="feat-icon">✦</span> Private Contact CRM Notes</div>
            <div class="feat-item"><span class="feat-icon">✦</span> Privacy Shield Screen Blur</div>
          </div>
        </div>

        <div class="right-col">
          <div class="mockup-header">
            <div class="mockup-title">
              <span style="color:#60a5fa">●</span> Google Messages for Web
            </div>
            <div class="pill-btn">
              <span style="background:rgba(255,255,255,0.2);padding:1px 4px;border-radius:3px;font-size:9px">PRO</span>
              <span>Text</span>
            </div>
          </div>
          <div class="mockup-tabs">
            <span class="mtab active">All (14)</span>
            <span class="mtab">Unread (3)</span>
            <span class="mtab">Follow-Up (2)</span>
            <span class="mtab">Work</span>
          </div>
          <div class="mockup-body">
            <div class="chat-bubble-out">
              Hey {firstName}! Just confirming our rehearsal schedule for Thursday at 6:30 PM. See you then!
            </div>
            <div class="undo-bar">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="color:#60a5fa">⏱️</span>
                <span>Sending in <strong>2s</strong>...</span>
              </div>
              <span class="undo-btn">Undo (Esc)</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(OUT_DIR, 'marquee_promo_1400x560.png'), type: 'png' });

  // ==========================================
  // 4. SCREENSHOTS (1280x800 each)
  // ==========================================
  const screenshots = [
    {
      file: 'screenshot1_bulk_announcements.png',
      badge: 'PERSONALIZED BROADCASTS',
      title: 'Personalized Bulk Announcements & Group Texting',
      subtitle: 'Send individual 1-on-1 texts with {firstName} tags, reusable lists, and safe carrier pauses.',
      bodyHtml: `
        <div style="background:#131314;border:1px solid #2d2f31;border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid #2d2f31;padding-bottom:14px">
            <div>
              <h3 style="font-size:18px;font-weight:700;color:#fff">📢 Group Texting & Announcements</h3>
              <p style="font-size:12px;color:#9aa0a6">Campaign dispatch with smart tag replacement and randomized delivery pacing</p>
            </div>
            <span style="background:#1d4ed8;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px">Ready to Send</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
            <div>
              <label style="font-size:12px;font-weight:600;color:#9aa0a6;display:block;margin-bottom:6px">Select Recipient Group</label>
              <div style="background:#1e1f20;border:1px solid #3c4043;padding:10px 14px;border-radius:10px;font-size:13px;color:#e8eaed;display:flex;justify-content:space-between">
                <span>Team Leads & Volunteers (42 contacts)</span>
                <span style="color:#8ab4f8">▾</span>
              </div>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#9aa0a6;display:block;margin-bottom:6px">Smart Variable Tags</label>
              <div style="display:flex;gap:6px">
                <span style="background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px">{firstName}</span>
                <span style="background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px">{lastName}</span>
                <span style="background:#2563eb;color:#fff;font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px">{phone}</span>
              </div>
            </div>
          </div>
          <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:12px;padding:16px;margin-bottom:20px">
            <div style="font-size:13px;line-height:1.6;color:#e8eaed">
              Hi <span style="background:rgba(59,130,246,0.3);padding:2px 6px;border-radius:4px;color:#93c5fd;font-weight:600">{firstName}</span>, just reminding you of our team kickoff tomorrow at 7:00 PM at the main hall. Let me know if you can make it!
            </div>
          </div>
          <div style="background:#182234;border:1px solid #1e3a8a;border-radius:12px;padding:14px;display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:12px">
              <span style="font-size:20px">🛡️</span>
              <div>
                <div style="font-size:12px;font-weight:700;color:#93c5fd">Carrier Protection Active</div>
                <div style="font-size:11px;color:#cbd5e1">2.5s - 5.0s randomized delay between messages prevents spam detection</div>
              </div>
            </div>
            <button style="background:#2563eb;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-weight:700;font-size:13px">Start Campaign</button>
          </div>
        </div>
      `
    },
    {
      file: 'screenshot2_themes_darkmode.png',
      badge: 'THEME ENGINE',
      title: 'Material Themes, AMOLED Pure Black & Theme Builder',
      subtitle: 'Transform Google Messages into a breathtaking OLED dark interface or design your own color palette.',
      bodyHtml: `
        <div style="background:#131314;border:1px solid #2d2f31;border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
            <h3 style="font-size:18px;font-weight:700;color:#fff">🎨 Color Themes & Appearance</h3>
            <span style="background:#2563eb;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:8px">+ Build Custom Theme</span>
          </div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:10px">DARK THEMES (AMOLED & NIGHT MODES)</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;margin-bottom:20px">
            <div style="background:#000000;border:2px solid #3b82f6;padding:14px;border-radius:12px;color:#fff">
              <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px"><span style="color:#3b82f6">●</span> AMOLED Pure Black</div>
              <div style="font-size:10px;color:#60a5fa;margin-top:4px">Active • True #000000</div>
            </div>
            <div style="background:#1e1f29;border:1px solid #44475a;padding:14px;border-radius:12px;color:#fff">
              <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px"><span style="color:#bd93f9">●</span> Dracula</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:4px">Vampire purple & slate</div>
            </div>
            <div style="background:#0f172a;border:1px solid #1e293b;padding:14px;border-radius:12px;color:#fff">
              <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px"><span style="color:#38bdf8">●</span> Navy Midnight</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:4px">Deep oceanic dark</div>
            </div>
            <div style="background:#06231c;border:1px solid #064e3b;padding:14px;border-radius:12px;color:#fff">
              <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px"><span style="color:#10b981">●</span> Emerald Forest</div>
              <div style="font-size:10px;color:#94a3b8;margin-top:4px">Organic deep green</div>
            </div>
          </div>
          <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:10px">LIGHT THEMES (CLEAN & EYE-FRIENDLY)</div>
          <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:10px">
            <div style="background:#ffffff;border:1px solid #e2e8f0;padding:14px;border-radius:12px;color:#0f172a">
              <div style="font-size:13px;font-weight:700">Clean Light</div>
              <div style="font-size:10px;color:#64748b;margin-top:4px">Crisp neutral daylight</div>
            </div>
            <div style="background:#f8fafc;border:1px solid #cbd5e1;padding:14px;border-radius:12px;color:#0f172a">
              <div style="font-size:13px;font-weight:700">Nordic Frost</div>
              <div style="font-size:10px;color:#64748b;margin-top:4px">Cool ice-blue accents</div>
            </div>
            <div style="background:#fefce8;border:1px solid #fef08a;padding:14px;border-radius:12px;color:#0f172a">
              <div style="font-size:13px;font-weight:700">Warm Paper</div>
              <div style="font-size:10px;color:#64748b;margin-top:4px">Bookish sepia reading</div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:14px;border-radius:12px;color:#0f172a">
              <div style="font-size:13px;font-weight:700">Mint Breeze</div>
              <div style="font-size:10px;color:#64748b;margin-top:4px">Calming botanical tint</div>
            </div>
          </div>
        </div>
      `
    },
    {
      file: 'screenshot3_smart_folders.png',
      badge: 'ORGANIZATION',
      title: 'Smart Conversation Folders & Unread Filtering',
      subtitle: 'Separate work, personal chats, and urgent follow-ups with automatic categorization and unread badges.',
      bodyHtml: `
        <div style="background:#131314;border:1px solid #2d2f31;border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
          <div style="display:flex;gap:10px;margin-bottom:24px;overflow-x:auto;padding-bottom:6px">
            <div style="background:#2563eb;color:#fff;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px">
              <span>All Chats</span>
              <span style="background:rgba(255,255,255,0.25);padding:1px 6px;border-radius:999px;font-size:11px">24</span>
            </div>
            <div style="background:#1e1f20;border:1px solid #3c4043;color:#e8eaed;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px">
              <span>Unread</span>
              <span style="background:#ef4444;color:#fff;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:800">5</span>
            </div>
            <div style="background:#1e1f20;border:1px solid #3c4043;color:#e8eaed;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px">
              <span>🚩 Follow-Up</span>
              <span style="background:#f59e0b;color:#fff;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:800">3</span>
            </div>
            <div style="background:#1e1f20;border:1px solid #3c4043;color:#e8eaed;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px">
              <span>💼 Work & Clients</span>
            </div>
            <div style="background:#1e1f20;border:1px solid #3c4043;color:#e8eaed;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px">
              <span>🏠 Family</span>
            </div>
            <div style="background:rgba(255,255,255,0.06);border:1px dashed #4b5563;color:#9ca3af;padding:8px 14px;border-radius:999px;font-size:13px">+ New Tab</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="display:flex;align-items:center;gap:14px">
                <div style="width:40px;height:40px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">DG</div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#fff">Daniella Gollan <span style="background:rgba(234,179,8,0.2);color:#facc15;font-size:10px;padding:2px 6px;border-radius:4px;margin-left:6px">Flagged</span></div>
                  <div style="font-size:12px;color:#9ca3af">Sounds great! I will pick up the groceries after...</div>
                </div>
              </div>
              <span style="font-size:11px;color:#6b7280">10:42 AM</span>
            </div>
            <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="display:flex;align-items:center;gap:14px">
                <div style="width:40px;height:40px;border-radius:50%;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">AH</div>
                <div>
                  <div style="font-size:14px;font-weight:700;color:#fff">Aaron Hope Church</div>
                  <div style="font-size:12px;color:#9ca3af">Amen, thank you pastor! The slides are ready for...</div>
                </div>
              </div>
              <span style="font-size:11px;color:#6b7280">Yesterday</span>
            </div>
          </div>
        </div>
      `
    },
    {
      file: 'screenshot4_undo_send.png',
      badge: 'SAFEGUARDS',
      title: 'Undo Send Safety Buffer & Delayed Sending',
      subtitle: 'Catch typos, wrong recipients, or accidental sends with an instant 3-second cancellation buffer.',
      bodyHtml: `
        <div style="background:#131314;border:1px solid #2d2f31;border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.5)">
          <div style="max-width:700px;margin:0 auto">
            <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:16px;padding:20px;margin-bottom:24px">
              <div style="font-size:12px;color:#9ca3af;margin-bottom:8px">Composer Text Box</div>
              <div style="font-size:14px;color:#e8eaed;line-height:1.6">
                Attached the invoice for the October design sprint. Please review when you have a moment!
              </div>
            </div>
            <div style="background:linear-gradient(135deg, #1e293b, #0f172a);border:2px solid #3b82f6;border-radius:16px;padding:20px 24px;box-shadow:0 8px 30px rgba(37,99,235,0.3)">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:22px">⏱️</span>
                  <div>
                    <div style="font-size:14px;font-weight:800;color:#fff">Holding message in safety buffer...</div>
                    <div style="font-size:11px;color:#93c5fd">Sending in 2.1 seconds &bull; Recipient verified</div>
                  </div>
                </div>
                <button style="background:#ef4444;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(239,68,68,0.4)">
                  UNDO SEND (Esc)
                </button>
              </div>
              <div style="width:100%;height:6px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden">
                <div style="width:65%;height:100%;background:linear-gradient(90deg, #3b82f6, #06b6d4);border-radius:999px"></div>
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      file: 'screenshot5_crm_privacy.png',
      badge: 'PRODUCTIVITY & PRIVACY',
      title: 'Private CRM Notes, Screen Blur & Material Settings',
      subtitle: 'Keep confidential notes on contacts, blur screens in public spaces, and tune every feature.',
      bodyHtml: `
        <div style="background:#131314;border:1px solid #2d2f31;border-radius:16px;padding:24px;box-shadow:0 12px 36px rgba(0,0,0,0.5);display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:12px;padding:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span style="font-size:18px">📝</span>
              <h4 style="font-size:14px;font-weight:700;color:#fff">Private Contact Notes (Local CRM)</h4>
            </div>
            <p style="font-size:11px;color:#9ca3af;margin-bottom:12px">Stored only on this PC. Never shared with Google or phone contacts.</p>
            <div style="background:#131314;border:1px solid #2d2f31;border-radius:8px;padding:12px;font-size:12px;color:#cbd5e1;line-height:1.6">
              • Daughter graduated nursing school in Oct<br>
              • Follow up regarding Sunday volunteering<br>
              • Preferred meeting time: Tuesday mornings
            </div>
          </div>
          <div style="background:#1e1f20;border:1px solid #3c4043;border-radius:12px;padding:18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span style="font-size:18px">🛡️</span>
              <h4 style="font-size:14px;font-weight:700;color:#fff">Privacy Shield (Screen Blur)</h4>
            </div>
            <p style="font-size:11px;color:#9ca3af;margin-bottom:12px">Instant privacy in coffee shops or open offices. Hotkey: <strong>Alt + P</strong></p>
            <div style="background:#131314;border:1px solid #2d2f31;border-radius:8px;padding:14px;text-align:center">
              <div style="filter:blur(6px);font-size:13px;color:#e8eaed;margin-bottom:8px">Confidential message content preview blurred</div>
              <span style="font-size:11px;color:#60a5fa;font-weight:600">Hover over any message bubble to reveal</span>
            </div>
          </div>
        </div>
      `
    }
  ];

  for (let i = 0; i < screenshots.length; i++) {
    const s = screenshots[i];
    console.log(`Generating Screenshot ${i + 1}/5: ${s.file}...`);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin:0; padding:0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            body {
              width: 1280px;
              height: 800px;
              background: #0b0f19;
              color: #ffffff;
              display: flex;
              flex-direction: column;
              padding: 48px 64px;
              justify-content: space-between;
              position: relative;
              overflow: hidden;
            }
            .header {
              margin-bottom: 24px;
            }
            .badge {
              display: inline-block;
              background: rgba(37, 99, 235, 0.2);
              border: 1px solid rgba(59, 130, 246, 0.4);
              color: #60a5fa;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.08em;
              padding: 4px 10px;
              border-radius: 6px;
              margin-bottom: 10px;
            }
            h1 {
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -0.02em;
              margin-bottom: 8px;
              background: linear-gradient(180deg, #ffffff 0%, #e2e8f0 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .sub {
              font-size: 16px;
              color: #94a3b8;
            }
            .content-area {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .footer-strip {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              padding-top: 18px;
              margin-top: 24px;
              font-size: 13px;
              color: #64748b;
            }
            .brand-tag {
              display: flex;
              align-items: center;
              gap: 8px;
              color: #cbd5e1;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">${s.badge}</span>
            <h1>${s.title}</h1>
            <div class="sub">${s.subtitle}</div>
          </div>

          <div class="content-area">
            ${s.bodyHtml}
          </div>

          <div class="footer-strip">
            <div class="brand-tag">
              <span style="background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">PRO</span>
              <span>ProText for Google Messages™</span>
            </div>
            <div>100% Local-First &bull; Zero Remote Tracking &bull; Free & Open-Source</div>
          </div>
        </body>
      </html>
    `);
    await page.screenshot({ path: path.join(OUT_DIR, s.file), type: 'png' });
  }

  await browser.close();
  console.log('✅ All Store Assets generated successfully in store_assets/!');
}

main().catch(console.error);
