const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox']
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('=== Step 1: Navigate to login page ===');
  try {
    await page.goto('https://172.27.52.233/virtualization-dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  } catch (e) {
    // Try without waiting for networkidle
    await page.goto('https://172.27.52.233/virtualization-dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-page.png'), fullPage: true });
  console.log('Login page screenshot taken');

  // Print page title and URL
  console.log('Page title:', await page.title());
  console.log('Page URL:', page.url());

  // Try to find login form elements
  console.log('\n=== Step 2: Attempting login ===');

  // Print all input fields on the page
  const inputs = await page.$$eval('input', els => els.map(el => ({
    type: el.type,
    name: el.name,
    id: el.id,
    placeholder: el.placeholder,
    className: el.className
  })));
  console.log('Input fields found:', JSON.stringify(inputs, null, 2));

  // Print all buttons
  const buttons = await page.$$eval('button, input[type="submit"], [role="button"]', els => els.map(el => ({
    tag: el.tagName,
    text: el.textContent?.trim(),
    type: el.type,
    className: el.className
  })));
  console.log('Buttons found:', JSON.stringify(buttons, null, 2));

  // Try common login patterns
  let loginSuccess = false;

  // Pattern 1: Standard username/password inputs
  try {
    const usernameInput = await page.$('input[name="username"], input[name="account"], input[type="text"]:first-of-type, input[placeholder*="用户"], input[placeholder*="账号"], input[placeholder*="user"], input[placeholder*="admin"]');
    const passwordInput = await page.$('input[type="password"], input[name="password"]');

    if (usernameInput && passwordInput) {
      await usernameInput.click();
      await usernameInput.fill('admin');
      await page.waitForTimeout(500);

      await passwordInput.click();
      await passwordInput.fill('password');
      await page.waitForTimeout(500);

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-filled.png'), fullPage: true });

      // Try to find and click submit button
      const submitBtn = await page.$('button[type="submit"], button:has-text("登录"), button:has-text("Login"), button:has-text("确定"), .login-btn, .submit-btn');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        // Try pressing Enter
        await passwordInput.press('Enter');
      }

      await page.waitForTimeout(5000);
      loginSuccess = true;
      console.log('Login attempted via form fill');
    }
  } catch (e) {
    console.log('Form fill login failed:', e.message);
  }

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-after-login.png'), fullPage: true });
  console.log('After login URL:', page.url());
  console.log('After login title:', await page.title());

  // Extract design system information
  console.log('\n=== Step 3: Extracting design system info ===');

  const designInfo = await page.evaluate(() => {
    const result = {
      colors: new Set(),
      bgColors: new Set(),
      borderColors: new Set(),
      fontFamilies: new Set(),
      fontSizes: new Set(),
      fontWeights: new Set(),
      lineHeights: new Set(),
      borderRadii: new Set(),
      paddings: new Set(),
      margins: new Set(),
      shadows: new Set(),
      transitions: new Set(),
      zIndices: new Set()
    };

    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const style = window.getComputedStyle(el);

      if (style.color && style.color !== 'rgba(0, 0, 0, 0)') result.colors.add(style.color);
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') result.bgColors.add(style.backgroundColor);
      if (style.borderColor && style.borderColor !== 'rgba(0, 0, 0, 0)') result.borderColors.add(style.borderColor);
      if (style.fontFamily) result.fontFamilies.add(style.fontFamily);
      if (style.fontSize) result.fontSizes.add(style.fontSize);
      if (style.fontWeight) result.fontWeights.add(style.fontWeight);
      if (style.lineHeight && style.lineHeight !== 'normal') result.lineHeights.add(style.lineHeight);
      if (style.borderRadius && style.borderRadius !== '0px') result.borderRadii.add(style.borderRadius);
      if (style.padding && style.padding !== '0px') result.paddings.add(style.padding);
      if (style.boxShadow && style.boxShadow !== 'none') result.shadows.add(style.boxShadow);
      if (style.transition && style.transition !== 'all 0s ease 0s') result.transitions.add(style.transition);
      if (style.zIndex && style.zIndex !== 'auto') result.zIndices.add(style.zIndex);
    });

    // Convert Sets to Arrays for JSON
    const output = {};
    for (const [key, val] of Object.entries(result)) {
      output[key] = [...val];
    }
    return output;
  });

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'design-tokens-raw.json'),
    JSON.stringify(designInfo, null, 2)
  );
  console.log('Design tokens extracted and saved');

  // Print summary
  console.log('\nDesign tokens summary:');
  console.log(`  Colors: ${designInfo.colors.length}`);
  console.log(`  BG Colors: ${designInfo.bgColors.length}`);
  console.log(`  Border Colors: ${designInfo.borderColors.length}`);
  console.log(`  Font Families: ${designInfo.fontFamilies.length}`);
  console.log(`  Font Sizes: ${designInfo.fontSizes.length}`);
  console.log(`  Font Weights: ${designInfo.fontWeights.length}`);
  console.log(`  Border Radii: ${designInfo.borderRadii.length}`);
  console.log(`  Shadows: ${designInfo.shadows.length}`);

  // Try to navigate to common dashboard sub-pages
  console.log('\n=== Step 4: Navigating dashboard pages ===');

  // Get all navigation links
  const navLinks = await page.$$eval('a, [role="menuitem"], .nav-item, .menu-item, li[class*="menu"], li[class*="nav"]', els =>
    els.map(el => ({
      text: el.textContent?.trim().substring(0, 50),
      href: el.href || '',
      className: el.className?.substring?.(0, 80) || ''
    })).filter(l => l.text && l.text.length > 0)
  );
  console.log('Navigation links found:', JSON.stringify(navLinks.slice(0, 30), null, 2));

  // Get sidebar/menu structure
  const menuStructure = await page.$$eval('nav, [role="navigation"], .sidebar, .menu, .ant-menu, .el-menu, [class*="sidebar"], [class*="menu"]', els =>
    els.map(el => ({
      tag: el.tagName,
      className: el.className?.substring?.(0, 100) || '',
      childCount: el.children.length,
      text: el.textContent?.trim().substring(0, 200)
    }))
  );
  console.log('\nMenu structures:', JSON.stringify(menuStructure.slice(0, 10), null, 2));

  // Capture more pages by clicking nav items
  const navItems = await page.$$('.ant-menu-item, .el-menu-item, [class*="nav-item"], [class*="menu-item"], nav a, .sidebar a');
  console.log(`\nFound ${navItems.length} clickable nav items`);

  let pageIndex = 4;
  const visitedPages = new Set([page.url()]);

  for (let i = 0; i < Math.min(navItems.length, 10); i++) {
    try {
      const item = navItems[i];
      const text = await item.textContent();
      if (!text || text.trim().length === 0) continue;

      console.log(`\nClicking nav item: "${text.trim()}"`);
      await item.click();
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      if (!visitedPages.has(currentUrl)) {
        visitedPages.add(currentUrl);
        pageIndex++;
        const filename = `${String(pageIndex).padStart(2, '0')}-page-${text.trim().replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_').substring(0, 30)}.png`;
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: true });
        console.log(`Screenshot saved: ${filename}`);
      }
    } catch (e) {
      console.log(`Nav click error: ${e.message}`);
    }
  }

  // Extract HTML structure info for component analysis
  console.log('\n=== Step 5: Component analysis ===');

  const componentInfo = await page.evaluate(() => {
    // Detect UI framework
    const frameworks = {
      antd: !!document.querySelector('[class*="ant-"]'),
      elementUI: !!document.querySelector('[class*="el-"]'),
      iview: !!document.querySelector('[class*="ivu-"]'),
      bootstrap: !!document.querySelector('[class*="btn-"], .container, .row, .col'),
      tailwind: !!document.querySelector('[class*="flex"], [class*="grid"]'),
      material: !!document.querySelector('[class*="mdc-"], [class*="MuiV"]'),
      vuetify: !!document.querySelector('[class*="v-"]'),
    };

    // Get all unique class prefixes
    const allClasses = new Set();
    document.querySelectorAll('*').forEach(el => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(/\s+/).forEach(cls => {
          const prefix = cls.split('-')[0].split('_')[0];
          if (prefix.length > 1) allClasses.add(prefix);
        });
      }
    });

    // Get component types
    const components = {
      buttons: document.querySelectorAll('button, [role="button"], .btn, [class*="button"]').length,
      inputs: document.querySelectorAll('input, textarea, select').length,
      tables: document.querySelectorAll('table, [class*="table"]').length,
      modals: document.querySelectorAll('[class*="modal"], [class*="dialog"], [role="dialog"]').length,
      cards: document.querySelectorAll('[class*="card"]').length,
      tabs: document.querySelectorAll('[class*="tab"], [role="tab"]').length,
      dropdowns: document.querySelectorAll('[class*="dropdown"], [class*="select"]').length,
      icons: document.querySelectorAll('svg, i[class*="icon"], [class*="icon"]').length,
      breadcrumbs: document.querySelectorAll('[class*="breadcrumb"]').length,
      pagination: document.querySelectorAll('[class*="pagination"], [class*="pager"]').length,
      alerts: document.querySelectorAll('[class*="alert"], [class*="message"], [class*="notification"]').length,
      tooltips: document.querySelectorAll('[class*="tooltip"], [class*="popover"]').length,
      tags: document.querySelectorAll('[class*="tag"], [class*="badge"]').length,
      progress: document.querySelectorAll('[class*="progress"]').length,
      charts: document.querySelectorAll('canvas, [class*="chart"], [class*="echarts"]').length,
    };

    return {
      frameworks,
      classePrefixes: [...allClasses].sort(),
      components,
      metaTags: [...document.querySelectorAll('meta')].map(m => ({name: m.name, content: m.content})).filter(m => m.name),
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href),
      scripts: [...document.querySelectorAll('script[src]')].map(s => s.src)
    };
  });

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'component-analysis.json'),
    JSON.stringify(componentInfo, null, 2)
  );
  console.log('Component analysis saved');
  console.log('Detected frameworks:', JSON.stringify(componentInfo.frameworks));
  console.log('Components count:', JSON.stringify(componentInfo.components));
  console.log('Class prefixes sample:', componentInfo.classePrefixes.slice(0, 30).join(', '));

  // Extract CSS variables (custom properties)
  const cssVars = await page.evaluate(() => {
    const vars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === 'body') {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                vars[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheet, skip
      }
    }
    return vars;
  });

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'css-variables.json'),
    JSON.stringify(cssVars, null, 2)
  );
  console.log('\nCSS Variables found:', Object.keys(cssVars).length);
  if (Object.keys(cssVars).length > 0) {
    console.log('Sample CSS vars:', JSON.stringify(Object.entries(cssVars).slice(0, 20)));
  }

  // Final full page screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '99-final-state.png'), fullPage: true });

  await browser.close();
  console.log('\n=== Done! ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
