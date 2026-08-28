const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173/login');
  
  // Login as HR
  await page.type('input[type="email"]', 'hr@movicloudlabs.com');
  await page.type('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  console.log('Logged in as HR. URL:', page.url());
  
  // Go to /hr/interns
  await page.goto('http://localhost:5173/hr/interns');
  console.log('Navigated to /hr/interns. URL:', page.url());
  
  // Get body text
  const bodyHandle = await page.$('body');
  const html = await page.evaluate(body => body.innerHTML, bodyHandle);
  await bodyHandle.dispose();
  
  console.log('Body length:', html.length);
  if (html.includes('Intern Directory')) {
    console.log('Intern Directory found!');
  } else {
    console.log('Intern Directory NOT found!');
  }
  
  await browser.close();
})();
