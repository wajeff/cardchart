import { test, expect } from "@playwright/test";
import { chromium } from "playwright";

export async function scrapeCards() {
  const map = new Map();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
  });

  //AMEX_Cobalt Scrape

  const page = await context.newPage();
  await page.goto(
    "https://www.americanexpress.com/en-ca/credit-cards/cobalt-card/",
  );
  let promoText = await page
    .locator('[data-qe-id="BannerNewMemberOffer"]')
    .first()
    .textContent();
  console.log(promoText);
  map.set("amex_cobalt", promoText);

  let cardFeeText = await page
  .locator('[data-qe-id="NewMemberBanner"]')
  .locator('[data-qe-id="Row"]')
  .nth(1)
  .textContent();
  console.log(cardFeeText)
  map.set('amex_cobalt', map.get("amex_cobalt") + cardFeeText)


  //AMEX_Platinum Scrape

  await page.goto(
    "https://www.americanexpress.com/en-ca/charge-cards/the-platinum-card/",
  );
  promoText = await page
    .locator(".sc_mo_full-screen-double-offer_rightColumn")
    .first()
    .textContent();
  console.log(promoText);
  map.set("amex_platinum", promoText);

  cardFeeText = await page
  .locator('[data-qe-id="NewMemberBanner"]')
  .locator('[data-qe-id="Row"]')
  .nth(0)
  .textContent();
  console.log(cardFeeText)
  map.set('amex_platinum', map.get("amex_platinum") + cardFeeText)

  //AMEX_Gold Scrape

  await page.goto(
    "https://www.americanexpress.com/en-ca/credit-cards/gold-rewards-card/",
  );
  promoText = await page
    .locator(".sc_se_pentagon-and-zero-apr-composable-banner_vertical")
    .first()
    .textContent();
  console.log(promoText);
  map.set("amex_gold", promoText);

  cardFeeText = await page
  .locator('[data-qe-id="NewMemberBanner"]')
  .locator('[data-qe-id="Row"]')
  .nth(0)
  .textContent();
  console.log(cardFeeText)
  map.set('amex_gold', map.get("amex_gold") + cardFeeText)


  //TD_First_Class Scrape
  await page.goto(
    "https://www.td.com/ca/en/personal-banking/products/credit-cards/aeroplan/aeroplan-visa-infinite-card?sourcecode=A0899&ranMID=39732&ranEAID=GaCy8kZbhuw&ranSiteID=GaCy8kZbhuw-O2rQqmu3K_llxaVwplJZFw",
  );
  promoText = await page
    .locator(".cmp-banner-product-right-aligned__offer-text")
    .locator(".cmp-text")
    .textContent();
  console.log(promoText);
  map.set("td_first_class", promoText);

  cardFeeText = await page
  .locator('.cmp-banner-product-right-aligned__list')
  .textContent();
  console.log(cardFeeText)
  map.set('td_first_class', map.get("td_first_class") + cardFeeText)

  await browser.close();

  return map;
}

