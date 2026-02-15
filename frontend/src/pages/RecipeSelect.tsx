import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RecipeListItem {
    id: string;
    name: string;
}

const RecipeSelect = () => {
    const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            try {
                const qs = query ? `?q=${encodeURIComponent(query)}` : '';
                const res = await fetch(`/api/recipes${qs}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`${res.status}`);
                const data = await res.json();
                setRecipes(data);
            } catch (err) {
                if ((err as any).name !== 'AbortError') {
                    console.error('Failed to load recipe list', err);
                    alert('レシピ一覧の取得に失敗しました。');
                }
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [query]);

    return (
        <div className="recipe-select">
            <div className="hero">
                <h1>作る料理を選ぶ</h1>
                <p>検索しても、一覧から選んでもOK。レシピを選んで手順作成へ進みましょう。</p>
            </div>
            <div className="search-box">
                <input
                    type="text"
                    placeholder="料理名で検索（部分一致）"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <span className="search-hint">Enterキーで確定、入力するだけでも絞り込みます。</span>
            </div>
            {loading && <p className="status">読み込み中...</p>}
            <div className="recipe-grid">
                {recipes.map((recipe) => (
                    <div key={recipe.id} className="recipe-card">
                        <div className="recipe-card__body">
                            <h3>{recipe.name}</h3>
                            <p className="recipe-card__desc">このレシピで手順を組み立てます。</p>
                        </div>
                        <button className="primary" onClick={() => navigate(`/recipe/${recipe.id}`)}>
                            このレシピを開く
                        </button>
                    </div>
                ))}
            </div>
            {!loading && recipes.length === 0 && <p className="status">該当するレシピがありません</p>}
        </div>
    );
};

export default RecipeSelect;
