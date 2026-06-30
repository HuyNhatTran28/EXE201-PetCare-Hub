# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: owner-flow.spec.ts >> Owner Flow UI E2E Automated Verification >> should login, manage pet profile, update medical records, and browse hotels
- Location: tests\owner-flow.spec.ts:4:3

# Error details

```
Error: page.waitForURL: Target page, context or browser has been closed
=========================== logs ===========================
waiting for navigation to "http://localhost:5173/" until "load"
============================================================
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Owner Flow UI E2E Automated Verification', () => {
  4   |   test('should login, manage pet profile, update medical records, and browse hotels', async ({ page }) => {
  5   |     // 1. Go to login page
  6   |     await page.goto('/login');
  7   |     await expect(page).toHaveURL(/.*login/);
  8   |     console.log('Successfully navigated to Login Page');
  9   | 
  10  |     // 2. Perform Login with Demo Customer Credentials
  11  |     await page.locator('input[type="email"]').fill('khachhangdemo@gmail.com');
  12  |     await page.locator('input[type="password"]').fill('123123123');
  13  |     await page.locator('button[type="submit"]').click();
  14  |     console.log('Login form submitted');
  15  | 
  16  |     // 3. Wait for redirect to home
> 17  |     await page.waitForURL('http://localhost:5173/');
      |                ^ Error: page.waitForURL: Target page, context or browser has been closed
  18  |     console.log('Successfully logged in and redirected to Home Page');
  19  | 
  20  |     // 4. Navigate directly to Pet Profile page
  21  |     await page.goto('/profile');
  22  |     await expect(page).toHaveURL(/.*profile/);
  23  |     console.log('Navigated to Pet Profile page');
  24  | 
  25  |     // 5. Add a new pet
  26  |     await page.locator('button:has-text("Thêm thú cưng mới")').click();
  27  |     console.log('Clicked "Thêm thú cưng mới" button');
  28  | 
  29  |     // Generate a unique name to avoid duplicates
  30  |     const petName = `Bông Gòn ${Math.floor(Math.random() * 1000)} 🐩`;
  31  |     await page.locator('input[placeholder="VD: Kiki, Bơ..."]').fill(petName);
  32  |     
  33  |     // Select Species: Dog
  34  |     await page.locator('button:has-text("Chó")').click();
  35  |     
  36  |     // Fill Breed, Age, Weight
  37  |     await page.locator('input[placeholder="VD: Golden Retriever, Persian..."]').fill('Poodle Nhật');
  38  |     await page.locator('input[placeholder="2"]').fill('1');
  39  |     await page.locator('input[placeholder="4.5"]').fill('3');
  40  |     
  41  |     // Fill Food and schedule
  42  |     await page.locator('input[placeholder="VD: Hạt Royal Canin, đồ ăn ướt..."]').fill('Hạt Poodle cao cấp');
  43  |     await page.locator('input[placeholder="VD: Hai bữa chính lúc 8:00 và 18:00..."]').fill('Sáng 7h, Tối 19h');
  44  |     
  45  |     // Select personality tags
  46  |     await page.locator('button:has-text("Thân thiện")').click();
  47  |     await page.locator('button:has-text("Ngoan ngoãn")').click();
  48  | 
  49  |     // Check vaccinated
  50  |     await page.locator('label:has-text("Đã tiêm vaccine đầy đủ") input[type="checkbox"]').check();
  51  |     
  52  |     // Save new pet
  53  |     await page.locator('button:has-text("Thêm thú cưng")').click();
  54  |     console.log('Submitted "Thêm thú cưng" form');
  55  | 
  56  |     // Confirm custom alert popup
  57  |     await page.locator('button:has-text("Đồng ý")').click();
  58  |     console.log('Confirmed success alert modal');
  59  | 
  60  |     // 6. Update Medical Record for the newly added pet
  61  |     await page.locator('button:has-text("Cập nhật hồ sơ y tế")').click();
  62  |     console.log('Clicked "Cập nhật hồ sơ y tế" button');
  63  | 
  64  |     // Fill contact details
  65  |     await page.locator('input[placeholder="Nhập số điện thoại liên lạc khi khẩn cấp..."]').fill('0999888777');
  66  |     await page.locator('input[placeholder="Nhập địa chỉ nhà của bạn..."]').fill('400 Lê Văn Việt, Quận 9, TP. HCM');
  67  | 
  68  |     // Expand / Add clinical checkup history
  69  |     await page.locator('button:has-text("+ Thêm lượt khám")').click();
  70  |     console.log('Added a new checkup record row');
  71  | 
  72  |     await page.locator('input[placeholder="VD: BV thú y ABC, Phòng khám XYZ..."]').fill('Bệnh viện thú y PetCare');
  73  |     await page.locator('input[placeholder="Mắc bệnh gì..."]').fill('Khám tổng quát sức khỏe');
  74  |     await page.locator('input[placeholder="Thuốc sử dụng, liều lượng..."]').fill('Vitamin C bổ sung');
  75  |     await page.locator('select').selectOption('Đã khỏi bệnh');
  76  | 
  77  |     // Save medical record
  78  |     await page.locator('button:has-text("Lưu hồ sơ y tế")').click();
  79  |     console.log('Submitted "Lưu hồ sơ y tế" form');
  80  | 
  81  |     // Confirm custom alert popup
  82  |     await page.locator('button:has-text("Đồng ý")').click();
  83  |     console.log('Confirmed success alert modal for medical record');
  84  | 
  85  |     // 7. Browse hotels and simulate booking
  86  |     await page.goto('/hotels');
  87  |     console.log('Navigated to Hotels search page');
  88  | 
  89  |     // Click "Đặt ngay" on the first hotel card
  90  |     await page.locator('button:has-text("Đặt ngay")').first().click();
  91  |     console.log('Clicked "Đặt ngay" on the first hotel card');
  92  | 
  93  |     // Verify detail page
  94  |     await expect(page).toHaveURL(/.*hotels\/.+/);
  95  |     console.log('Successfully loaded Hotel Detail page!');
  96  | 
  97  |     // Take a screenshot of the hotel detail UI to confirm correctness
  98  |     await page.screenshot({ path: 'tests/hotel-detail-screenshot.png' });
  99  |     console.log('Saved hotel detail screenshot as tests/hotel-detail-screenshot.png');
  100 |   });
  101 | });
  102 | 
```