// ============================================================================
// Antigravity <-> Figma Bridge: Plugin Canvas Sandbox (code.js)
// ============================================================================

figma.showUI(__html__, { width: 360, height: 460, themeColors: true });

// --- Color & Geometry Utilities ---
function hexToRgb(hex) {
  if (!hex) return { r: 0.1, g: 0.1, b: 0.15 };
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  if (isNaN(bigint)) return { r: 0.1, g: 0.1, b: 0.15 };
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

function rgbToHex(r, g, b) {
  const toHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function loadRequiredFonts() {
  const fonts = [
    { family: 'Inter', style: 'Regular' },
    { family: 'Inter', style: 'Medium' },
    { family: 'Inter', style: 'Semi Bold' },
    { family: 'Inter', style: 'Bold' }
  ];

  for (const f of fonts) {
    try {
      await figma.loadFontAsync(f);
    } catch (err) {
      try {
        await figma.loadFontAsync({ family: 'Roboto', style: f.style === 'Bold' || f.style === 'Semi Bold' ? 'Bold' : 'Regular' });
      } catch (e) {
        // Continue fallback
      }
    }
  }
}

function createTextNode(text, size = 14, style = 'Regular', colorHex = '#F8FAFC') {
  const node = figma.createText();
  try {
    node.fontName = { family: 'Inter', style };
  } catch (e) {
    try {
      node.fontName = { family: 'Roboto', style: style === 'Bold' ? 'Bold' : 'Regular' };
    } catch (err) {
      // Use default font
    }
  }
  node.characters = String(text != null ? text : '');
  node.fontSize = size;
  node.fills = [{ type: 'SOLID', color: hexToRgb(colorHex) }];
  return node;
}

function createBadge(text, bgHex = '#1E1B4B', textHex = '#818CF8', radius = 6) {
  const badge = figma.createFrame();
  badge.name = 'Badge: ' + text;
  badge.layoutMode = 'HORIZONTAL';
  badge.counterAxisAlignItems = 'CENTER';
  badge.primaryAxisAlignItems = 'CENTER';
  badge.paddingLeft = 8;
  badge.paddingRight = 8;
  badge.paddingTop = 4;
  badge.paddingBottom = 4;
  badge.cornerRadius = radius;
  badge.fills = [{ type: 'SOLID', color: hexToRgb(bgHex) }];

  const label = createTextNode(text, 11, 'Medium', textHex);
  badge.appendChild(label);
  return badge;
}

function createButton(label, variant = 'primary', iconText = '') {
  const btn = figma.createFrame();
  btn.name = 'Button: ' + label;
  btn.layoutMode = 'HORIZONTAL';
  btn.counterAxisAlignItems = 'CENTER';
  btn.primaryAxisAlignItems = 'CENTER';
  btn.paddingLeft = 16;
  btn.paddingRight = 16;
  btn.paddingTop = 10;
  btn.paddingBottom = 10;
  btn.itemSpacing = 6;
  btn.cornerRadius = 8;

  let bgHex = '#6366F1';
  let textHex = '#FFFFFF';

  if (variant === 'secondary') {
    bgHex = '#1E293B';
    textHex = '#E2E8F0';
    btn.strokes = [{ type: 'SOLID', color: hexToRgb('#475569') }];
    btn.strokeWeight = 1;
  } else if (variant === 'success') {
    bgHex = '#059669';
    textHex = '#FFFFFF';
  } else if (variant === 'danger') {
    bgHex = '#DC2626';
    textHex = '#FFFFFF';
  } else if (variant === 'ghost') {
    bgHex = '#0F172A';
    textHex = '#94A3B8';
  }

  btn.fills = [{ type: 'SOLID', color: hexToRgb(bgHex) }];

  if (iconText) {
    const icon = createTextNode(iconText, 12, 'Regular', textHex);
    btn.appendChild(icon);
  }

  const textNode = createTextNode(label, 13, 'Semi Bold', textHex);
  btn.appendChild(textNode);
  return btn;
}

function createAvatar(initials = 'TF', size = 36, bgHex = '#4F46E5', textHex = '#FFFFFF') {
  const avatar = figma.createFrame();
  avatar.name = 'Avatar: ' + initials;
  avatar.resize(size, size);
  avatar.cornerRadius = size / 2;
  avatar.layoutMode = 'HORIZONTAL';
  avatar.primaryAxisAlignItems = 'CENTER';
  avatar.counterAxisAlignItems = 'CENTER';
  avatar.fills = [{ type: 'SOLID', color: hexToRgb(bgHex) }];

  const label = createTextNode(initials, Math.round(size * 0.4), 'Bold', textHex);
  avatar.appendChild(label);
  return avatar;
}

function createDivider(colorHex = '#334155') {
  const divider = figma.createFrame();
  divider.name = 'Divider';
  divider.resize(100, 1);
  divider.layoutAlign = 'STRETCH';
  divider.fills = [{ type: 'SOLID', color: hexToRgb(colorHex) }];
  return divider;
}

// --- Component Renderers ---

// 1. Candidate / Feature Card
async function renderCardComponent(spec) {
  const root = figma.createFrame();
  root.name = spec.title || 'Candidate Card';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'FIXED';
  root.resize(440, 100);
  root.paddingLeft = 24;
  root.paddingRight = 24;
  root.paddingTop = 24;
  root.paddingBottom = 24;
  root.itemSpacing = 16;
  root.cornerRadius = 16;
  root.fills = [{ type: 'SOLID', color: hexToRgb(spec.bgColor || '#0F172A') }];
  root.strokes = [{ type: 'SOLID', color: hexToRgb(spec.borderColor || '#334155') }];
  root.strokeWeight = 1;

  // Header Row
  const header = figma.createFrame();
  header.name = 'Header';
  header.layoutMode = 'HORIZONTAL';
  header.layoutAlign = 'STRETCH';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  header.counterAxisAlignItems = 'CENTER';
  header.fills = [];

  const leftGroup = figma.createFrame();
  leftGroup.name = 'Avatar & Title';
  leftGroup.layoutMode = 'HORIZONTAL';
  leftGroup.counterAxisAlignItems = 'CENTER';
  leftGroup.itemSpacing = 12;
  leftGroup.fills = [];

  const initials = (spec.title || 'JD').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const avatar = createAvatar(initials, 42, '#4F46E5', '#FFFFFF');
  leftGroup.appendChild(avatar);

  const titleCol = figma.createFrame();
  titleCol.name = 'Title Details';
  titleCol.layoutMode = 'VERTICAL';
  titleCol.itemSpacing = 3;
  titleCol.fills = [];

  const titleText = createTextNode(spec.title || 'Alex Morgan', 16, 'Bold', '#F8FAFC');
  const subtitleText = createTextNode(spec.role || spec.subtitle || 'Senior Cloud Architect', 12, 'Regular', '#94A3B8');
  titleCol.appendChild(titleText);
  titleCol.appendChild(subtitleText);
  leftGroup.appendChild(titleCol);
  header.appendChild(leftGroup);

  if (spec.matchScore || spec.status) {
    const badge = createBadge(
      spec.matchScore ? `Match: ${spec.matchScore}` : spec.status,
      '#1E1B4B',
      '#818CF8'
    );
    header.appendChild(badge);
  }
  root.appendChild(header);
  root.appendChild(createDivider());

  // Summary
  if (spec.summary || spec.description) {
    const desc = createTextNode(spec.summary || spec.description, 13, 'Regular', '#CBD5E1');
    desc.layoutAlign = 'STRETCH';
    root.appendChild(desc);
  }

  // Skills Chips
  if (Array.isArray(spec.skills) && spec.skills.length > 0) {
    const chipsFrame = figma.createFrame();
    chipsFrame.name = 'Skills Chips';
    chipsFrame.layoutMode = 'HORIZONTAL';
    chipsFrame.layoutAlign = 'STRETCH';
    chipsFrame.itemSpacing = 8;
    chipsFrame.fills = [];

    spec.skills.forEach(skill => {
      chipsFrame.appendChild(createBadge(skill, '#1E293B', '#93C5FD'));
    });
    root.appendChild(chipsFrame);
  }

  // Actions Row
  const actions = figma.createFrame();
  actions.name = 'Actions Row';
  actions.layoutMode = 'HORIZONTAL';
  actions.layoutAlign = 'STRETCH';
  actions.itemSpacing = 12;
  actions.fills = [];

  const pBtn = createButton(spec.primaryAction || 'Shortlist Candidate', 'primary');
  const sBtn = createButton(spec.secondaryAction || 'View Full Resume', 'secondary');
  pBtn.layoutGrow = 1;
  sBtn.layoutGrow = 1;
  actions.appendChild(pBtn);
  actions.appendChild(sBtn);
  root.appendChild(actions);

  return root;
}

// 2. Full Recruiter Dashboard Screen
async function renderDashboardScreen(spec) {
  const screen = figma.createFrame();
  screen.name = spec.title || 'TalentFlow - Recruiter Dashboard';
  screen.layoutMode = 'VERTICAL';
  screen.primaryAxisSizingMode = 'AUTO';
  screen.counterAxisSizingMode = 'FIXED';
  screen.resize(1140, 100);
  screen.fills = [{ type: 'SOLID', color: hexToRgb('#0B0F19') }];
  screen.paddingLeft = 32;
  screen.paddingRight = 32;
  screen.paddingTop = 24;
  screen.paddingBottom = 32;
  screen.itemSpacing = 24;
  screen.cornerRadius = 16;

  // Top Navbar
  const navbar = figma.createFrame();
  navbar.name = 'Navbar';
  navbar.layoutMode = 'HORIZONTAL';
  navbar.layoutAlign = 'STRETCH';
  navbar.primaryAxisAlignItems = 'SPACE_BETWEEN';
  navbar.counterAxisAlignItems = 'CENTER';
  navbar.fills = [];

  const brand = figma.createFrame();
  brand.name = 'Brand';
  brand.layoutMode = 'HORIZONTAL';
  brand.counterAxisAlignItems = 'CENTER';
  brand.itemSpacing = 10;
  brand.fills = [];
  brand.appendChild(createAvatar('TF', 32, '#6366F1', '#FFFFFF'));
  brand.appendChild(createTextNode('TalentFlow AI', 16, 'Bold', '#F8FAFC'));
  navbar.appendChild(brand);

  const navLinks = figma.createFrame();
  navLinks.name = 'Nav Links';
  navLinks.layoutMode = 'HORIZONTAL';
  navLinks.itemSpacing = 20;
  navLinks.fills = [];
  ['Dashboard', 'Candidates', 'Jobs', 'AI Sourcing', 'Analytics'].forEach((link, idx) => {
    navLinks.appendChild(createTextNode(link, 13, idx === 0 ? 'Bold' : 'Regular', idx === 0 ? '#818CF8' : '#94A3B8'));
  });
  navbar.appendChild(navLinks);

  const userProfile = figma.createFrame();
  userProfile.name = 'Profile';
  userProfile.layoutMode = 'HORIZONTAL';
  userProfile.counterAxisAlignItems = 'CENTER';
  userProfile.itemSpacing = 10;
  userProfile.fills = [];
  userProfile.appendChild(createBadge('Live Sync', '#064E3B', '#34D399'));
  userProfile.appendChild(createAvatar('HR', 32, '#3B82F6', '#FFFFFF'));
  navbar.appendChild(userProfile);
  screen.appendChild(navbar);

  screen.appendChild(createDivider('#1E293B'));

  // Metrics KPI Row
  const kpiRow = figma.createFrame();
  kpiRow.name = 'KPI Metrics Row';
  kpiRow.layoutMode = 'HORIZONTAL';
  kpiRow.layoutAlign = 'STRETCH';
  kpiRow.itemSpacing = 16;
  kpiRow.fills = [];

  const metrics = spec.metrics || [
    { label: 'Total Applicants', value: '1,428', change: '+18%', positive: true },
    { label: 'Shortlisted', value: '142', change: '+12%', positive: true },
    { label: 'Interviews Today', value: '8', change: 'Scheduled', positive: true },
    { label: 'Hired This Month', value: '24', change: '+25%', positive: true }
  ];

  metrics.forEach(m => {
    const kpiCard = figma.createFrame();
    kpiCard.name = 'KPI: ' + m.label;
    kpiCard.layoutMode = 'VERTICAL';
    kpiCard.layoutGrow = 1;
    kpiCard.paddingLeft = 20;
    kpiCard.paddingRight = 20;
    kpiCard.paddingTop = 18;
    kpiCard.paddingBottom = 18;
    kpiCard.itemSpacing = 8;
    kpiCard.cornerRadius = 12;
    kpiCard.fills = [{ type: 'SOLID', color: hexToRgb('#111827') }];
    kpiCard.strokes = [{ type: 'SOLID', color: hexToRgb('#1F2937') }];
    kpiCard.strokeWeight = 1;

    const labelRow = figma.createFrame();
    labelRow.layoutMode = 'HORIZONTAL';
    labelRow.layoutAlign = 'STRETCH';
    labelRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
    labelRow.fills = [];
    labelRow.appendChild(createTextNode(m.label, 12, 'Regular', '#9CA3AF'));
    labelRow.appendChild(createBadge(m.change, m.positive ? '#064E3B' : '#7F1D1D', m.positive ? '#34D399' : '#F87171', 4));
    kpiCard.appendChild(labelRow);

    const valText = createTextNode(m.value, 26, 'Bold', '#F9FAFB');
    kpiCard.appendChild(valText);
    kpiRow.appendChild(kpiCard);
  });
  screen.appendChild(kpiRow);

  // Split Content: Candidates List & Pipeline Tracker
  const contentRow = figma.createFrame();
  contentRow.name = 'Dashboard Body';
  contentRow.layoutMode = 'HORIZONTAL';
  contentRow.layoutAlign = 'STRETCH';
  contentRow.itemSpacing = 20;
  contentRow.fills = [];

  // Left: Top Candidate Matches
  const leftPanel = figma.createFrame();
  leftPanel.name = 'Top Candidates Panel';
  leftPanel.layoutMode = 'VERTICAL';
  leftPanel.layoutGrow = 3;
  leftPanel.paddingLeft = 20;
  leftPanel.paddingRight = 20;
  leftPanel.paddingTop = 20;
  leftPanel.paddingBottom = 20;
  leftPanel.itemSpacing = 14;
  leftPanel.cornerRadius = 12;
  leftPanel.fills = [{ type: 'SOLID', color: hexToRgb('#111827') }];
  leftPanel.strokes = [{ type: 'SOLID', color: hexToRgb('#1F2937') }];
  leftPanel.strokeWeight = 1;

  const panelHeader = figma.createFrame();
  panelHeader.layoutMode = 'HORIZONTAL';
  panelHeader.layoutAlign = 'STRETCH';
  panelHeader.primaryAxisAlignItems = 'SPACE_BETWEEN';
  panelHeader.fills = [];
  panelHeader.appendChild(createTextNode('Top AI-Matched Candidates', 14, 'Bold', '#F9FAFB'));
  panelHeader.appendChild(createButton('Upload Resume', 'primary', '+'));
  leftPanel.appendChild(panelHeader);
  leftPanel.appendChild(createDivider('#1F2937'));

  const candidates = spec.candidates || [
    { name: 'Sarah Jenkins', role: 'Full Stack Engineer', score: '96%', tags: ['React', 'Node.js', 'PostgreSQL'] },
    { name: 'David Chen', role: 'Machine Learning Specialist', score: '92%', tags: ['Python', 'PyTorch', 'FastAPI'] },
    { name: 'Maya Patel', role: 'DevOps & Cloud Architect', score: '88%', tags: ['Kubernetes', 'Terraform', 'AWS'] }
  ];

  candidates.forEach(c => {
    const cRow = figma.createFrame();
    cRow.name = 'Candidate: ' + c.name;
    cRow.layoutMode = 'HORIZONTAL';
    cRow.layoutAlign = 'STRETCH';
    cRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
    cRow.counterAxisAlignItems = 'CENTER';
    cRow.paddingLeft = 12;
    cRow.paddingRight = 12;
    cRow.paddingTop = 10;
    cRow.paddingBottom = 10;
    cRow.cornerRadius = 8;
    cRow.fills = [{ type: 'SOLID', color: hexToRgb('#1F2937') }];

    const info = figma.createFrame();
    info.layoutMode = 'HORIZONTAL';
    info.counterAxisAlignItems = 'CENTER';
    info.itemSpacing = 10;
    info.fills = [];
    info.appendChild(createAvatar(c.name.split(' ').map(n => n[0]).join(''), 32, '#4F46E5', '#FFFFFF'));

    const meta = figma.createFrame();
    meta.layoutMode = 'VERTICAL';
    meta.itemSpacing = 2;
    meta.fills = [];
    meta.appendChild(createTextNode(c.name, 13, 'Bold', '#F9FAFB'));
    meta.appendChild(createTextNode(c.role, 11, 'Regular', '#9CA3AF'));
    info.appendChild(meta);
    cRow.appendChild(info);

    const rightGroup = figma.createFrame();
    rightGroup.layoutMode = 'HORIZONTAL';
    rightGroup.counterAxisAlignItems = 'CENTER';
    rightGroup.itemSpacing = 10;
    rightGroup.fills = [];
    rightGroup.appendChild(createBadge(`Score: ${c.score}`, '#1E1B4B', '#818CF8'));
    rightGroup.appendChild(createButton('Review', 'secondary'));
    cRow.appendChild(rightGroup);

    leftPanel.appendChild(cRow);
  });
  contentRow.appendChild(leftPanel);

  // Right: Quick Actions & Pipeline
  const rightPanel = figma.createFrame();
  rightPanel.name = 'Pipeline Quick Stats';
  rightPanel.layoutMode = 'VERTICAL';
  rightPanel.layoutGrow = 2;
  rightPanel.paddingLeft = 20;
  rightPanel.paddingRight = 20;
  rightPanel.paddingTop = 20;
  rightPanel.paddingBottom = 20;
  rightPanel.itemSpacing = 14;
  rightPanel.cornerRadius = 12;
  rightPanel.fills = [{ type: 'SOLID', color: hexToRgb('#111827') }];
  rightPanel.strokes = [{ type: 'SOLID', color: hexToRgb('#1F2937') }];
  rightPanel.strokeWeight = 1;

  rightPanel.appendChild(createTextNode('Pipeline Distribution', 14, 'Bold', '#F9FAFB'));
  rightPanel.appendChild(createDivider('#1F2937'));

  const stages = [
    { name: 'Applied / Ingested', count: 48, color: '#3B82F6' },
    { name: 'AI Screened (Score > 75%)', count: 26, color: '#8B5CF6' },
    { name: 'Technical Interview', count: 12, color: '#F59E0B' },
    { name: 'Offer Extended', count: 4, color: '#10B981' }
  ];

  stages.forEach(st => {
    const stRow = figma.createFrame();
    stRow.layoutMode = 'HORIZONTAL';
    stRow.layoutAlign = 'STRETCH';
    stRow.primaryAxisAlignItems = 'SPACE_BETWEEN';
    stRow.counterAxisAlignItems = 'CENTER';
    stRow.fills = [];
    stRow.appendChild(createTextNode(st.name, 12, 'Regular', '#E5E7EB'));
    stRow.appendChild(createBadge(String(st.count), '#1F2937', st.color));
    rightPanel.appendChild(stRow);
  });
  contentRow.appendChild(rightPanel);

  screen.appendChild(contentRow);
  return screen;
}

// 3. Candidate Data Table
async function renderTableComponent(spec) {
  const root = figma.createFrame();
  root.name = spec.title || 'Candidate Data Table';
  root.layoutMode = 'VERTICAL';
  root.primaryAxisSizingMode = 'AUTO';
  root.counterAxisSizingMode = 'FIXED';
  root.resize(800, 100);
  root.paddingLeft = 20;
  root.paddingRight = 20;
  root.paddingTop = 20;
  root.paddingBottom = 20;
  root.itemSpacing = 12;
  root.cornerRadius = 14;
  root.fills = [{ type: 'SOLID', color: hexToRgb('#0F172A') }];
  root.strokes = [{ type: 'SOLID', color: hexToRgb('#334155') }];
  root.strokeWeight = 1;

  // Title bar
  const header = figma.createFrame();
  header.layoutMode = 'HORIZONTAL';
  header.layoutAlign = 'STRETCH';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  header.counterAxisAlignItems = 'CENTER';
  header.fills = [];
  header.appendChild(createTextNode(spec.title || 'Applicant Pipeline Table', 16, 'Bold', '#F8FAFC'));
  header.appendChild(createBadge('5 Active Records', '#1E1B4B', '#818CF8'));
  root.appendChild(header);

  // Table Header Row
  const th = figma.createFrame();
  th.name = 'Table Header';
  th.layoutMode = 'HORIZONTAL';
  th.layoutAlign = 'STRETCH';
  th.paddingLeft = 12;
  th.paddingRight = 12;
  th.paddingTop = 10;
  th.paddingBottom = 10;
  th.cornerRadius = 6;
  th.fills = [{ type: 'SOLID', color: hexToRgb('#1E293B') }];

  const cols = ['Candidate', 'Role Target', 'AI Match', 'Status', 'Action'];
  const widths = [200, 180, 100, 120, 100];

  cols.forEach((col, idx) => {
    const colFrame = figma.createFrame();
    colFrame.resize(widths[idx], 20);
    colFrame.fills = [];
    colFrame.appendChild(createTextNode(col, 12, 'Bold', '#94A3B8'));
    th.appendChild(colFrame);
  });
  root.appendChild(th);

  // Rows
  const rows = spec.rows || [
    { name: 'Elena Rostova', role: 'Senior React Dev', score: '95%', status: 'Shortlisted', bg: '#064E3B', fg: '#34D399' },
    { name: 'Marcus Vance', role: 'DevOps Engineer', score: '89%', status: 'Screening', bg: '#1E1B4B', fg: '#818CF8' },
    { name: 'Aaliyah Khan', role: 'Product Designer', score: '91%', status: 'Interview', bg: '#78350F', fg: '#FBBF24' },
    { name: 'Lucas Scott', role: 'Full Stack Java', score: '82%', status: 'Review', bg: '#1F2937', fg: '#9CA3AF' }
  ];

  rows.forEach(r => {
    const tr = figma.createFrame();
    tr.name = 'Row: ' + r.name;
    tr.layoutMode = 'HORIZONTAL';
    tr.layoutAlign = 'STRETCH';
    tr.counterAxisAlignItems = 'CENTER';
    tr.paddingLeft = 12;
    tr.paddingRight = 12;
    tr.paddingTop = 12;
    tr.paddingBottom = 12;
    tr.cornerRadius = 6;
    tr.fills = [{ type: 'SOLID', color: hexToRgb('#1E293B40') }];
    tr.strokes = [{ type: 'SOLID', color: hexToRgb('#334155') }];
    tr.strokeWeight = 1;

    // Col 1: Name
    const c1 = figma.createFrame();
    c1.resize(200, 24);
    c1.fills = [];
    c1.appendChild(createTextNode(r.name, 13, 'Semi Bold', '#F8FAFC'));
    tr.appendChild(c1);

    // Col 2: Role
    const c2 = figma.createFrame();
    c2.resize(180, 24);
    c2.fills = [];
    c2.appendChild(createTextNode(r.role, 12, 'Regular', '#94A3B8'));
    tr.appendChild(c2);

    // Col 3: Score
    const c3 = figma.createFrame();
    c3.resize(100, 24);
    c3.fills = [];
    c3.appendChild(createBadge(r.score, '#1E1B4B', '#818CF8'));
    tr.appendChild(c3);

    // Col 4: Status
    const c4 = figma.createFrame();
    c4.resize(120, 24);
    c4.fills = [];
    c4.appendChild(createBadge(r.status, r.bg || '#1F2937', r.fg || '#E5E7EB'));
    tr.appendChild(c4);

    // Col 5: Action
    const c5 = figma.createFrame();
    c5.resize(100, 24);
    c5.fills = [];
    c5.appendChild(createButton('Open', 'secondary'));
    tr.appendChild(c5);

    root.appendChild(tr);
  });

  return root;
}

// 4. Modal Dialog
async function renderModalDialog(spec) {
  const modal = figma.createFrame();
  modal.name = spec.title || 'Schedule Interview Modal';
  modal.layoutMode = 'VERTICAL';
  modal.primaryAxisSizingMode = 'AUTO';
  modal.counterAxisSizingMode = 'FIXED';
  modal.resize(480, 100);
  modal.paddingLeft = 24;
  modal.paddingRight = 24;
  modal.paddingTop = 24;
  modal.paddingBottom = 24;
  modal.itemSpacing = 16;
  modal.cornerRadius = 16;
  modal.fills = [{ type: 'SOLID', color: hexToRgb('#0F172A') }];
  modal.strokes = [{ type: 'SOLID', color: hexToRgb('#334155') }];
  modal.strokeWeight = 1;

  // Title bar
  const header = figma.createFrame();
  header.layoutMode = 'HORIZONTAL';
  header.layoutAlign = 'STRETCH';
  header.primaryAxisAlignItems = 'SPACE_BETWEEN';
  header.counterAxisAlignItems = 'CENTER';
  header.fills = [];
  header.appendChild(createTextNode(spec.title || 'Schedule Technical Interview', 16, 'Bold', '#F8FAFC'));
  header.appendChild(createBadge('AI Assisted', '#1E1B4B', '#818CF8'));
  modal.appendChild(header);
  modal.appendChild(createDivider());

  // Input Fields
  const fields = spec.fields || [
    { label: 'Candidate Email', value: 'alex.morgan@example.com' },
    { label: 'Interview Date & Time', value: '2026-08-20 at 14:00 GMT+5:30' },
    { label: 'Interviewer', value: 'Senior Lead Architect' }
  ];

  fields.forEach(f => {
    const fGroup = figma.createFrame();
    fGroup.layoutMode = 'VERTICAL';
    fGroup.layoutAlign = 'STRETCH';
    fGroup.itemSpacing = 6;
    fGroup.fills = [];

    fGroup.appendChild(createTextNode(f.label, 12, 'Medium', '#94A3B8'));

    const input = figma.createFrame();
    input.layoutMode = 'HORIZONTAL';
    input.layoutAlign = 'STRETCH';
    input.paddingLeft = 14;
    input.paddingRight = 14;
    input.paddingTop = 10;
    input.paddingBottom = 10;
    input.cornerRadius = 8;
    input.fills = [{ type: 'SOLID', color: hexToRgb('#1E293B') }];
    input.strokes = [{ type: 'SOLID', color: hexToRgb('#475569') }];
    input.strokeWeight = 1;

    input.appendChild(createTextNode(f.value, 13, 'Regular', '#E2E8F0'));
    fGroup.appendChild(input);
    modal.appendChild(fGroup);
  });

  // Footer Buttons
  const footer = figma.createFrame();
  footer.layoutMode = 'HORIZONTAL';
  footer.layoutAlign = 'STRETCH';
  footer.itemSpacing = 12;
  footer.fills = [];

  const cancelBtn = createButton('Cancel', 'secondary');
  const confirmBtn = createButton(spec.confirmLabel || 'Confirm & Send Invite', 'primary');
  cancelBtn.layoutGrow = 1;
  confirmBtn.layoutGrow = 1;

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);
  modal.appendChild(footer);

  return modal;
}

// Master Dispatcher
async function renderDesignFromSpec(spec) {
  await loadRequiredFonts();

  let rootNode;
  const type = (spec.type || '').toLowerCase();

  if (type === 'dashboard' || type === 'screen') {
    rootNode = await renderDashboardScreen(spec);
  } else if (type === 'table') {
    rootNode = await renderTableComponent(spec);
  } else if (type === 'modal' || type === 'dialog') {
    rootNode = await renderModalDialog(spec);
  } else {
    rootNode = await renderCardComponent(spec);
  }

  // Position at viewport center
  const viewportCenter = figma.viewport.center;
  rootNode.x = viewportCenter.x - (rootNode.width / 2);
  rootNode.y = viewportCenter.y - (rootNode.height / 2);

  figma.currentPage.appendChild(rootNode);
  figma.currentPage.selection = [rootNode];
  figma.viewport.scrollAndZoomIntoView([rootNode]);

  return serializeNode(rootNode);
}

// --- Serializer & React Code Generator ---
function serializeNode(node) {
  const result = {
    id: node.id,
    name: node.name,
    type: node.type,
    width: Math.round(node.width),
    height: Math.round(node.height),
    children: []
  };

  if ('characters' in node) {
    result.text = node.characters;
    result.fontSize = node.fontSize;
  }

  if ('layoutMode' in node) {
    result.layoutMode = node.layoutMode;
    result.itemSpacing = node.itemSpacing;
    result.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft
    };
  }

  if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
    const f = node.fills[0];
    if (f.type === 'SOLID' && f.color) {
      result.fillHex = rgbToHex(f.color.r, f.color.g, f.color.b);
    }
  }

  if ('cornerRadius' in node) {
    result.cornerRadius = node.cornerRadius;
  }

  if ('children' in node && Array.isArray(node.children)) {
    result.children = node.children.map(child => serializeNode(child));
  }

  return result;
}

function generateReactTailwindCode(node) {
  function nodeToJSX(n, depth = 1) {
    const indent = '  '.repeat(depth);
    if (n.type === 'TEXT') {
      return `${indent}<span>${n.text || ''}</span>\n`;
    }

    const classes = [];
    if (n.layoutMode === 'VERTICAL') classes.push('flex', 'flex-col');
    if (n.layoutMode === 'HORIZONTAL') classes.push('flex', 'flex-row');

    if (n.fillHex) {
      classes.push(`bg-[${n.fillHex}]`);
    }

    if (n.cornerRadius) {
      classes.push(`rounded-[${n.cornerRadius}px]`);
    }

    if (n.padding) {
      classes.push(`p-[${n.padding.top || 12}px]`);
    }

    if (n.itemSpacing) {
      classes.push(`gap-[${n.itemSpacing}px]`);
    }

    const classStr = classes.join(' ');
    let jsx = `${indent}<div className="${classStr}">\n`;
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        jsx += nodeToJSX(child, depth + 1);
      }
    }
    jsx += `${indent}</div>\n`;
    return jsx;
  }

  return `import React from 'react';\n\nexport default function ${node.name.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent'}() {\n  return (\n${nodeToJSX(node, 2)}  );\n}\n`;
}

// --- Plugin Event Handlers ---
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'GENERATE_DESIGN') {
    try {
      figma.ui.postMessage({ type: 'LOG', message: `Building canvas for: ${msg.spec.title || 'Component'}` });
      const serialized = await renderDesignFromSpec(msg.spec);
      const reactCode = generateReactTailwindCode(serialized);

      figma.ui.postMessage({
        type: 'DESIGN_CREATED',
        payload: {
          requestId: msg.requestId,
          name: msg.spec.title || 'Generated Component',
          tree: serialized,
          reactCode,
          timestamp: new Date().toISOString()
        }
      });
      figma.notify('✨ Antigravity design rendered on canvas!');
    } catch (err) {
      figma.ui.postMessage({ type: 'LOG', message: `Render error: ${err.message}`, level: 'error' });
      figma.notify('❌ Failed to render: ' + err.message, { error: true });
    }
  }

  if (msg.type === 'EXPORT_SELECTION') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify('⚠️ Please select at least one frame or layer to export.');
      figma.ui.postMessage({ type: 'LOG', message: 'No layers selected in Figma', level: 'warn' });
      return;
    }

    const nodes = selection.map(node => serializeNode(node));
    const reactCode = generateReactTailwindCode(nodes[0]);

    const payload = {
      type: 'SELECTION_EXPORT',
      count: selection.length,
      name: selection[0].name || 'Exported Frame',
      nodes,
      reactCode,
      timestamp: new Date().toISOString()
    };

    figma.ui.postMessage({
      type: 'DESIGN_EXPORTED',
      payload
    });

    figma.notify(`📤 Exported ${selection.length} selected node(s) with React code to Antigravity!`);
  }
};
