const { chromium } = require('playwright');
const login = require('./login');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await login(page);

  // 正確建立行程頁面
  await page.goto('https://www.tripit.com/app/trip/create');
  await page.waitForLoadState('networkidle');

  // 填入 Trip 資料
  await page.fill('#trip-name', '東京六日家庭旅');

  // 地點自動完成並選取第一個結果
  const destinationInput = await page.$('[id^="typeahead-input-"]');
  if (destinationInput) {
    await destinationInput.fill('Tokyo, Japan');
    await destinationInput.press('Enter');
    await page.waitForTimeout(2000); // Wait for potential UI updates
    // Assuming 'Enter' selected the destination or closed the autocomplete.
  } else {
    throw new Error('❌ 找不到地點輸入欄位');
  }

  // 日期輸入：使用 page.fill() 並模擬失焦以觸發驗證
  await page.fill('#trip-start-date-input', '27/06/2025'); // DD/MM/YYYY
  await page.locator('#trip-start-date-input').blur();

  await page.fill('#trip-end-date-input', '02/07/2025'); // DD/MM/YYYY
  await page.locator('#trip-end-date-input').blur();

  // 點擊 Save 建立行程
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
    page.click('[data-cy="trip-form-save"]'),
  ]);
  console.log('✅ 已建立行程. Current URL:', page.url());

  await browser.close();
})();
