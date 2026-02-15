const fs = require('fs');
const path = require('path');

// Very small CSV parser to avoid extra deps. Handles quoted fields and commas.
const parseCsvLine = (line) => {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  fields.push(current);
  return fields;
};

const buildCsvPath = (recipeName, baseDir = __dirname) =>
  path.join(baseDir, 'standard_recipes', `standard_recipe_${recipeName}_steps.csv`);

/**
 * Convert 基準レシピ_<レシピ名>_手順.csv into the data_example.json shape:
 * { "<food_name>": { id: <csv id>, action: ["<action1>", ...] }, ... }
 *
 * @param {string} recipeName - e.g. "ハンバーグ"
 * @param {string} [csvPath] - Optional override path
 * @returns {Record<string, { id: number, action: string[] }>}
 */
const convertRecipeCsvToRecipeMap = (recipeName, csvPath = buildCsvPath(recipeName)) => {
  if (!recipeName) {
    throw new Error('recipeName is required (e.g. "ハンバーグ")');
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);

  // Drop header if present
  const dataLines = lines[0].includes('food_name') ? lines.slice(1) : lines;

  /** @type {Record<string, { id: number, action: string[] }>} */
  const result = {};
  /** @type {Record<string, Record<string, number>>} */
  const actionCounts = {};
  let runningId = 1; // assign IDs sequentially per unique ingredient in appearance order

  dataLines.forEach((line) => {
    const cleanLine = line.replace(/^\uFEFF/, ''); // strip BOM if any
    const cols = parseCsvLine(cleanLine);
    if (cols.length < 5) return;

    const [, , foodName, action, countRaw] = cols;
    if (!foodName || !action) return;
    const count = Number(countRaw) || 0;

    if (!result[foodName]) {
      result[foodName] = { id: runningId, action: [] };
      runningId += 1;
    }

    if (!actionCounts[foodName]) {
      actionCounts[foodName] = {};
    }
    actionCounts[foodName][action] = (actionCounts[foodName][action] || 0) + count;
  });

  // Sort each ingredient's actions by total count (desc) and attach to result
  Object.keys(result).forEach((foodName) => {
    const counts = actionCounts[foodName] || {};
    const sortedActions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([action]) => action);

    if (sortedActions.length > 0) {
      result[foodName].action = sortedActions;
    }
  });

  return result;
};

module.exports = {
  buildCsvPath,
  convertRecipeCsvToRecipeMap,
};

// Quick manual check:
// node backend/convertRecipeCsv.js ハンバーグ
// or node backend/convertRecipeCsv.js ハンバーグ ./some.csv
if (require.main === module) {
  const recipeName = process.argv[2] || 'ハンバーグ';
  const overridePath = process.argv[3];
  const converted = convertRecipeCsvToRecipeMap(recipeName, overridePath);
  console.log(JSON.stringify(converted, null, 2));
}
