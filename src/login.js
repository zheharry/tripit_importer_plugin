const { chromium } = require('playwright');
require('dotenv').config();

async function login(page) {
  await page.goto('https://www.tripit.com/account/login');

  await page.fill('input[name="login_email_address"]', process.env.TRIPIT_USER);
  await page.fill('input[name="login_password"]', process.env.TRIPIT_PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('form#authenticate button[type="submit"], form#authenticate input[type="submit"]'),
  ]);

  return page;
}

module.exports = login;
