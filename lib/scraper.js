/**
 * Price scraping utilities.
 *
 * - scrapePrice:   fetches a product page and extracts the price via a CSS selector
 * - fetchApiPrice: fetches a JSON API endpoint and extracts the first numeric price value
 */
import * as cheerio from 'cheerio';

/**
 * Parses a price string by stripping currency symbols, spaces, and commas.
 * Handles formats like "$1,299.99", "1.299,99", "USD 49.00".
 *
 * @param {string} text
 * @returns {number} Parsed float, or NaN if parsing fails
 */
function parsePrice(text) {
  if (!text) return NaN;
  // Remove everything except digits, periods, and commas
  const cleaned = text.replace(/[^0-9.,]/g, '');
  // Handle European format (1.234,56) vs US format (1,234.56)
  const normalised = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/,/g, '') // US: remove thousand-sep commas
    : cleaned.replace(',', '.'); // EU: convert decimal comma to period
  return parseFloat(normalised);
}

/**
 * Fetches a product page and extracts its price using a CSS selector.
 *
 * @param {string} url      - Full product page URL
 * @param {string} selector - CSS selector targeting the price element
 * @returns {Promise<number>} Parsed price as a float
 * @throws {Error} If fetch fails, selector matches nothing, or price cannot be parsed
 */
export async function scrapePrice(url, selector) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: HTTP ${response.status} for ${url}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Sanitize selector: strip pseudo-elements (::after, ::text, etc.) and
  // clean up trailing/leading combinators that make css-what throw.
  const cleanSelector = selector
    .replace(/::[\w-]+(\([^)]*\))?/g, '') // remove pseudo-elements
    .replace(/\s*[>+~]\s*$/g, '')         // remove trailing combinators
    .replace(/^\s*[>+~]\s*/g, '')         // remove leading combinators
    .trim();

  if (!cleanSelector) {
    throw new Error(`CSS selector "${selector}" is invalid or empty after sanitization`);
  }

  let element;
  try {
    element = $(cleanSelector).first();
  } catch (err) {
    throw new Error(`Invalid CSS selector "${selector}": ${err.message}`);
  }

  if (!element.length) {
    throw new Error(`CSS selector "${selector}" matched no elements on ${url}`);
  }

  const text = element.text().trim();
  const price = parsePrice(text);

  if (isNaN(price)) {
    throw new Error(`Could not parse a price from text: "${text}" (selector: "${selector}")`);
  }

  return price;
}

/**
 * Fetches a JSON API endpoint and returns the first positive numeric value found
 * via a shallow recursive search of the response object.
 *
 * @param {string} apiEndpoint - URL that returns JSON containing a price field
 * @returns {Promise<number>} Parsed price as a float
 * @throws {Error} If fetch fails or no numeric value is found
 */
export async function fetchApiPrice(apiEndpoint) {
  const response = await fetch(apiEndpoint, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API request failed: HTTP ${response.status} for ${apiEndpoint}`);
  }

  const data = await response.json();

  /**
   * Recursively searches an object for the first positive numeric value.
   * @param {*} obj
   * @param {number} depth
   * @returns {number | null}
   */
  const findPrice = (obj, depth = 0) => {
    if (depth > 6) return null;
    if (typeof obj === 'number' && obj > 0) return obj;
    if (typeof obj === 'string') {
      const parsed = parsePrice(obj);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj)) {
        const result = findPrice(val, depth + 1);
        if (result !== null) return result;
      }
    }
    return null;
  };

  const price = findPrice(data);
  if (price === null) {
    throw new Error(`No numeric price found in API response from ${apiEndpoint}`);
  }

  return price;
}
