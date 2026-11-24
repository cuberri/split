// Supported currencies. To add one, add a line here — that's it.
// The code must be an ISO 4217 code that Frankfurter (ECB data) supports,
// e.g. USD, GBP, JPY, SEK, NOK, DKK, PLN, CZK... `decimals` is the number of
// minor units (2 for cents, 0 for JPY).
export const CURRENCIES = {
  EUR: { name: 'Euro', decimals: 2 },
  CHF: { name: 'Swiss franc', decimals: 2 },
  // USD: { name: 'US dollar', decimals: 2 },
  // GBP: { name: 'British pound', decimals: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES);

export function decimals(code) {
  return CURRENCIES[code]?.decimals ?? 2;
}
