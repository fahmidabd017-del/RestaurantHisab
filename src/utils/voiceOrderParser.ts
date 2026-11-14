import type { BillItem, FoodItem } from '../types';

export interface MatchedVoiceItem {
  food: FoodItem;
  quantity: number;
  confidence: number;
}

const BENGALI_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const WORD_QUANTITIES: Record<string, number> = {
  // Bengali words
  এক: 1,
  একটা: 1,
  একটি: 1,
  একজন: 1,
  একপ্লেট: 1,
  এককাপ: 1,
  একগ্লাস: 1,
  একবোতল: 1,
  দুই: 2,
  দুইটা: 2,
  দুইটি: 2,
  দুটো: 2,
  দুটি: 2,
  দু: 2,
  দুইপ্লেট: 2,
  তিন: 3,
  তিনটা: 3,
  তিনটি: 3,
  তিনপ্লেট: 3,
  চার: 4,
  চারটা: 4,
  চারটি: 4,
  চারটে: 4,
  পাঁচ: 5,
  পাঁচটা: 5,
  পাঁচটি: 5,
  পাচ: 5,
  পাচটা: 5,
  ছয়: 6,
  ছয়টা: 6,
  ছয়: 6,
  ছয়টা: 6,
  ছয়টি: 6,
  সাত: 7,
  সাতটা: 7,
  সাতটি: 7,
  আট: 8,
  আটটা: 8,
  আটটি: 8,
  নয়: 9,
  নয়টা: 9,
  নয়: 9,
  নয়টা: 9,
  দশ: 10,
  দশটা: 10,
  দশটি: 10,
  এগারো: 11,
  বারো: 12,
  // Banglish / Romanized Bengali
  ekta: 1,
  ekti: 1,
  ek: 1,
  duita: 2,
  duto: 2,
  dui: 2,
  tinta: 3,
  tin: 3,
  charta: 4,
  char: 4,
  panchta: 5,
  pach: 5,
  choyta: 6,
  satta: 7,
  atta: 8,
  noyta: 9,
  doshta: 10,
  // English words
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const STOP_WORDS = new Set([
  'টা',
  'টি',
  'প্লেট',
  'কাপ',
  'গ্লাস',
  'বোতল',
  'পিস',
  'বাটি',
  'প্যাকেট',
  'দেন',
  'দিন',
  'দাও',
  'লাগবে',
  'চাই',
  'হবে',
  'অর্ডার',
  'করুন',
  'যোগ',
  'প্লিজ',
  'please',
  'plate',
  'plates',
  'cup',
  'cups',
  'glass',
  'bottle',
  'pieces',
  'piece',
  'order',
  'add',
]);

export function normalizeBengaliDigits(input: string): string {
  return input.replace(/[০-৯]/g, ch => BENGALI_DIGITS[ch] ?? ch);
}

function normalizeText(text: string): string {
  return normalizeBengaliDigits(text)
    .toLowerCase()
    .replace(/[।,.;:!?()[\]{}"'`~@#$%^&*_=+/\\|<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseQuantityToken(token: string): number | null {
  const cleaned = normalizeText(token);
  if (!cleaned) return null;

  if (/^\d+$/.test(cleaned)) {
    const val = parseInt(cleaned, 10);
    return val >= 1 && val <= 999 ? val : null;
  }

  // Handle patterns like "2টা", "3টি", "2x"
  const numSuffix = cleaned.match(/^(\d+)(?:টা|টি|x|pcs|pc|p)?$/);
  if (numSuffix) {
    const val = parseInt(numSuffix[1], 10);
    return val >= 1 && val <= 999 ? val : null;
  }

  if (cleaned in WORD_QUANTITIES) {
    return WORD_QUANTITIES[cleaned];
  }

  return null;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

function scoreFoodMatch(clauseText: string, foodName: string): number {
  const query = normalizeText(clauseText);
  const target = normalizeText(foodName);
  if (!query || !target) return 0;

  if (query === target) return 1.0;
  if (query.includes(target)) return 0.96;
  if (target.includes(query) && query.length >= 3) return 0.9;

  const queryTokens = query.split(' ').filter(t => t && !STOP_WORDS.has(t));
  const targetTokens = target.split(' ').filter(Boolean);
  if (queryTokens.length === 0 || targetTokens.length === 0) return 0;

  let matchedTokenScore = 0;
  for (const tTok of targetTokens) {
    let bestForTok = 0;
    for (const qTok of queryTokens) {
      if (qTok === tTok) {
        bestForTok = 1;
        break;
      }
      if (tTok.includes(qTok) && qTok.length >= 3) {
        bestForTok = Math.max(bestForTok, 0.85);
      } else if (qTok.includes(tTok) && tTok.length >= 3) {
        bestForTok = Math.max(bestForTok, 0.85);
      } else {
        const sim = similarity(qTok, tTok);
        if (sim >= 0.65) {
          bestForTok = Math.max(bestForTok, sim);
        }
      }
    }
    matchedTokenScore += bestForTok;
  }

  const coverage = matchedTokenScore / targetTokens.length;
  const fullSim = similarity(queryTokens.join(' '), target);
  return Math.max(coverage * 0.92, fullSim);
}

/**
 * Splits a spoken order transcript into clauses and matches each clause
 * to a food item from the restaurant's menu along with its quantity.
 */
export function parseVoiceTranscriptToItems(
  transcript: string,
  foods: FoodItem[]
): MatchedVoiceItem[] {
  if (!transcript || !transcript.trim() || foods.length === 0) {
    return [];
  }

  const normalized = normalizeBengaliDigits(transcript)
    .replace(/[।,;\n]+/g, '|')
    .replace(/\s+(?:এবং|আর|ও|সাথে|plus|and|&)\s+/gi, '|');

  const rawClauses = normalized
    .split('|')
    .map(c => c.trim())
    .filter(Boolean);

  // Also split clauses if multiple quantity tokens appear in the middle of a clause,
  // e.g. "2 kacchi biryani 1 borhani" -> ["2 kacchi biryani", "1 borhani"]
  const expandedClauses: string[] = [];
  for (const clause of rawClauses) {
    const tokens = clause.split(/\s+/).filter(Boolean);
    let currentTokens: string[] = [];
    let hasTextInCurrent = false;

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const qty = parseQuantityToken(tok);
      const hasSubsequentFoodText = tokens
        .slice(i + 1)
        .some(nextTok => parseQuantityToken(nextTok) === null && !STOP_WORDS.has(normalizeText(nextTok)));

      if (qty !== null && hasTextInCurrent && hasSubsequentFoodText && currentTokens.length > 0) {
        expandedClauses.push(currentTokens.join(' '));
        currentTokens = [tok];
        hasTextInCurrent = false;
      } else {
        currentTokens.push(tok);
        if (qty === null && !STOP_WORDS.has(normalizeText(tok))) {
          hasTextInCurrent = true;
        }
      }
    }
    if (currentTokens.length > 0) {
      expandedClauses.push(currentTokens.join(' '));
    }
  }

  const aggregated = new Map<string, MatchedVoiceItem>();

  for (const clause of expandedClauses) {
    const tokens = normalizeText(clause).split(' ').filter(Boolean);
    if (tokens.length === 0) continue;

    let quantity = 1;
    const foodTokens: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const parsedQty = parseQuantityToken(tok);
      if (parsedQty !== null && foodTokens.length === 0) {
        quantity = parsedQty;
        continue;
      }
      // Also support trailing quantity like "বোরহানি ২টা"
      if (parsedQty !== null && i === tokens.length - 1 && foodTokens.length > 0) {
        quantity = parsedQty;
        continue;
      }
      if (!STOP_WORDS.has(tok)) {
        foodTokens.push(tok);
      }
    }

    const foodQuery = foodTokens.join(' ').trim();
    if (!foodQuery) continue;

    let bestFood: FoodItem | null = null;
    let bestScore = 0;

    for (const food of foods) {
      const score = scoreFoodMatch(foodQuery, food.name);
      if (score > bestScore) {
        bestScore = score;
        bestFood = food;
      }
    }

    if (bestFood && bestScore >= 0.55) {
      const existing = aggregated.get(bestFood.id);
      if (existing) {
        existing.quantity += quantity;
        existing.confidence = Math.max(existing.confidence, bestScore);
      } else {
        aggregated.set(bestFood.id, {
          food: bestFood,
          quantity,
          confidence: bestScore,
        });
      }
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Extracts optional table or customer label from spoken Bengali/English text.
 */
export function extractCustomerNameFromTranscript(transcript: string): string | null {
  if (!transcript || !transcript.trim()) return null;
  const normalized = normalizeBengaliDigits(transcript);

  const tableMatch = normalized.match(/(?:টেবিল|table)\s*(?:নং|নম্বর|no|#)?\s*(\d+)/i);
  if (tableMatch) {
    return `টেবিল ${tableMatch[1]}`;
  }

  const customerMatch = normalized.match(/(?:কাস্টমার|গ্রাহক|customer|name)\s*[:ঃ-]?\s*([^\d,।|\n]{2,30})/i);
  if (customerMatch && customerMatch[1]) {
    return customerMatch[1].trim();
  }

  return null;
}

/**
 * Merges newly dictated menu items into an existing BillItem array without duplicates.
 */
export function mergeDictatedItems(
  existingItems: BillItem[],
  matched: { food: FoodItem; quantity: number }[]
): BillItem[] {
  const next = existingItems.map(item => ({ ...item }));

  for (const entry of matched) {
    const qty = Math.max(1, Math.round(entry.quantity));
    const idx = next.findIndex(i => i.foodId === entry.food.id);
    if (idx >= 0) {
      const current = next[idx];
      const nextQty = current.quantity + qty;
      next[idx] = {
        ...current,
        quantity: nextQty,
        total: nextQty * current.price,
      };
    } else {
      next.push({
        foodId: entry.food.id,
        name: entry.food.name,
        price: entry.food.price,
        quantity: qty,
        total: qty * entry.food.price,
      });
    }
  }

  return next;
}
