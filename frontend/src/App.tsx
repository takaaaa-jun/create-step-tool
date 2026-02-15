import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useRef, useState } from 'react'
import './App.css'
import BlocklyComponent from './components/BlocklyComponent'
import * as Blockly from 'blockly/core';
import RecipeSelect from './pages/RecipeSelect';

import html2canvas from 'html2canvas';

const RecipeBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [summary, setSummary] = useState<{ name: string; amount: number; unit: string; groupSymbol?: string }[]>([]);

  const unitLabel: Record<string, string> = {
    g: 'g',
    kg: 'kg',
    ml: 'ml',
    L: 'L',
    piece: '個',
    sheet: '枚',
    hon: '本',
    tablespoon: '大さじ',
    teaspoon: '小さじ',
    cup: 'カップ',
    as_needed: '適量',
    pinch: '少々',
    to_taste: 'お好みで',
    '': '',
  };

  const formatRow = (item: { name: string; amount: number; unit: string; groupSymbol?: string }) => {
    const unit = unitLabel[item.unit] ?? item.unit;
    const isFree = item.unit === 'as_needed' || item.unit === 'pinch' || item.unit === 'to_taste';
    const isPrefixUnit = item.unit === 'tablespoon' || item.unit === 'teaspoon' || item.unit === 'cup';

    const qty = isFree
      ? unit
      : isPrefixUnit
        ? `${unit}${item.amount}`
        : `${item.amount}${unit ? ` ${unit}` : ''}`;
    const prefix = item.groupSymbol ? `${item.groupSymbol} ` : '';
    return { name: `${prefix}${item.name}`, qty };
  };

  const handleWorkspaceChange = (workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
  };

  const saveRecipe = async () => {
    const target = document.querySelector('.builder-layout') as HTMLElement;
    if (target) {
      const canvas = await html2canvas(target);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recipe.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!id) {
    return null;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')}>← レシピ選択へ戻る</button>
          <h1>手順作成</h1>
        </div>
        <button className="save-button" onClick={saveRecipe}>
          レシピを保存 (PNG)
        </button>
      </header>
      <main className="builder-layout">
        <aside className="summary-card">
          <div className="summary-header">
            <div>
              <div className="pill">材料まとめ</div>
              <h3>材料リスト</h3>
            </div>
          </div>
          <div className="summary-body">
            {summary.length === 0 ? (
              <p className="muted">材料ブロックを追加するとここに表示されます。</p>
            ) : (
              <ul>
                {[
                  ...summary.filter((s) => !s.groupSymbol),
                  ...summary
                    .filter((s) => s.groupSymbol)
                    .sort((a, b) => (a.groupSymbol || '').localeCompare(b.groupSymbol || '')),
                ].map((item, idx) => {
                  const { name, qty } = formatRow(item);
                  return (
                    <li key={`${item.name}-${idx}-${item.groupSymbol || 'plain'}`}>
                      <span>{name}</span>
                      <span className="qty">{qty}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
        <div className="blockly-area">
          <BlocklyComponent
            recipeId={id}
            onWorkspaceChange={handleWorkspaceChange}
            onSummaryChange={setSummary}
          />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<RecipeSelect />} />
      <Route path="/recipe/:id" element={<RecipeBuilder />} />
      <Route
        path="*"
        element={
          <div style={{ padding: '2rem' }}>
            <p>ページが見つかりませんでした。<Link to="/">トップへ戻る</Link></p>
          </div>
        }
      />
    </Routes>
  )
}

export default App
