const http = require('http');
const fs = require('fs');
const path = require('path');
const { convertRecipeCsvToRecipeMap } = require('./convertRecipeCsv');

// Small CSV parser reused to handle quoted values.
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

const recipeListPath = path.join(__dirname, '基準レシピ.csv');

// Load recipe list from 基準レシピ.csv
const loadRecipes = () => {
  const raw = fs.readFileSync(recipeListPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const dataLines = lines[0].includes('category_medium') ? lines.slice(1) : lines;

  /** @type {{ id: string; name: string }[]} */
  const list = [];
  /** @type {Record<string, string>} */
  const map = {};

  dataLines.forEach((line) => {
    const cleanLine = line.replace(/^\uFEFF/, '');
    const cols = parseCsvLine(cleanLine);
    if (cols.length < 2) return;
    const [id, recipeName] = cols;
    map[id] = recipeName;
    list.push({ id, name: recipeName });
  });

  return { list, map };
};

const { list: recipeList, map: recipeNameById } = loadRecipes();

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // List recipes with optional search (?q=)
  if (url.pathname === '/api/recipes') {
    const q = (url.searchParams.get('q') || '').trim();
    const filtered = q
      ? recipeList.filter((r) => r.name.includes(q) || r.id.includes(q))
      : recipeList;
    sendJson(res, 200, filtered);
    return;
  }

  // Get a specific recipe's steps/ingredients/actions
  const match = url.pathname.match(/^\/api\/(\d+)\/?$/);

  if (!match) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const id = match[1];
  const recipeName = recipeNameById[id];

  if (!recipeName) {
    sendJson(res, 404, { error: `Recipe id ${id} not found` });
    return;
  }

  try {
    const data = convertRecipeCsvToRecipeMap(recipeName);
    sendJson(res, 200, data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      sendJson(res, 404, { error: `CSV for "${recipeName}" not found` });
    } else {
      console.error(err);
      sendJson(res, 500, { error: 'Internal Server Error' });
    }
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on http://0.0.0.0:${PORT}`);
});
