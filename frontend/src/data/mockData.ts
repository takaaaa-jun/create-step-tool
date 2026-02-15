export interface Ingredient {
    id: string;
    name: string;
}

export interface Action {
    id: string;
    name: string;
    allowedIngredients: string[]; // List of ingredient IDs
}

interface RawIngredientData {
    id: string | number;
    action: string[];
}

export interface RecipeData {
    ingredients: Ingredient[];
    actions: Action[];
    getAllowedActions: (ingredientId: string) => Action[];
}

const transformRawData = (data: Record<string, RawIngredientData>): RecipeData => {
    const ingredients: Ingredient[] = Object.entries(data).map(([name, info]) => ({
        id: String(info.id),
        name,
    }));

    const actionMap = new Map<string, string[]>();
    Object.values(data).forEach((info) => {
        const ingredientId = String(info.id);
        info.action.forEach((actionName: string) => {
            if (!actionMap.has(actionName)) {
                actionMap.set(actionName, []);
            }
            actionMap.get(actionName)?.push(ingredientId);
        });
    });

    const actions: Action[] = Array.from(actionMap.entries()).map(([name, allowedIngredients]) => ({
        id: name,
        name,
        allowedIngredients,
    }));

    const getAllowedActions = (ingredientId: string) => actions.filter(action => action.allowedIngredients.includes(ingredientId));

    return { ingredients, actions, getAllowedActions };
};

/**
 * Fetch recipe data from backend API and transform to frontend-friendly shape.
 * @param recipeId 基準レシピのID (例: "4")
 */
export const fetchRecipeData = async (recipeId: string): Promise<RecipeData> => {
    const res = await fetch(`/api/${recipeId}/`);
    if (!res.ok) {
        throw new Error(`Failed to load recipe data: ${res.status} ${res.statusText}`);
    }
    const raw = await res.json() as Record<string, RawIngredientData>;
    return transformRawData(raw);
};
