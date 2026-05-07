// Indian-style numbering: lakh (10^5) + crore (10^7).
// Example: 12,34,567 → "Twelve Lakh Thirty-Four Thousand Five Hundred Sixty-Seven"
const numberToWords = require('number-to-words');

const titleCase = (str) =>
    str.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

const wordsForUnder1000 = (n) => titleCase(numberToWords.toWords(n));

const integerToIndianWords = (num) => {
    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + integerToIndianWords(-num);

    const parts = [];
    const crore = Math.floor(num / 10000000);
    num = num % 10000000;
    const lakh = Math.floor(num / 100000);
    num = num % 100000;
    const thousand = Math.floor(num / 1000);
    num = num % 1000;
    const rest = num;

    if (crore > 0) parts.push(`${integerToIndianWords(crore)} Crore`);
    if (lakh > 0) parts.push(`${wordsForUnder1000(lakh)} Lakh`);
    if (thousand > 0) parts.push(`${wordsForUnder1000(thousand)} Thousand`);
    if (rest > 0) parts.push(wordsForUnder1000(rest));

    return parts.join(' ');
};

/**
 * Convert a rupee amount to Indian-style words including paise.
 * 1234.50 → "Rupees One Thousand Two Hundred Thirty-Four and Fifty Paise Only"
 */
const rupeesInWords = (amount) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '';
    const rupees = Math.floor(value);
    const paise = Math.round((value - rupees) * 100);

    let out = `Rupees ${integerToIndianWords(rupees)}`;
    if (paise > 0) out += ` and ${integerToIndianWords(paise)} Paise`;
    out += ' Only';
    return out;
};

module.exports = { rupeesInWords, integerToIndianWords };
