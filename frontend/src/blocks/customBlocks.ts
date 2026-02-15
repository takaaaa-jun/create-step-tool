import * as Blockly from 'blockly/core';
import './SearchableDropdown';
import type { RecipeData } from '../data/mockData';

// Define Ingredient Block (Value Block)

const ingredientBlock = (ingredientOptions: string[][]) => ({
    "type": "ingredient_block",
    "message0": "材料: %1",
    "args0": [
        {
            "type": "field_searchable_dropdown",
            "name": "INGREDIENT_ID",
            "options": ingredientOptions
        }
    ],
    "output": "Ingredient", // Output type
    "colour": 120,
    "tooltip": "食材を選択してください",
    "helpUrl": ""
});

const commonUnitsPostfix = [
    ["g", "g"],
    ["kg", "kg"],
    ["ml", "ml"],
    ["L", "L"],
    ["個", "piece"],
    ["枚", "sheet"],
    ["本", "hon"],
];

const spoonUnits = [
    ["大さじ", "tablespoon"],
    ["小さじ", "teaspoon"],
    ["カップ", "cup"],
];

const freeAmountUnits = [
    ["適量", "as_needed"],
    ["少々", "pinch"],
    ["お好みで", "to_taste"],
];

// 数値 -> 単位（g, ml など）
const ingredientMeasurePostfixBlock = (ingredientOptions: string[][]) => ({
    "type": "ingredient_measure_postfix_block",
    "message0": "材料: %1 %2 %3",
    "args0": [
        { "type": "field_searchable_dropdown", "name": "INGREDIENT_ID", "options": ingredientOptions },
        { "type": "field_number", "name": "AMOUNT", "value": 0, "min": 0 },
        { "type": "field_dropdown", "name": "UNIT", "options": commonUnitsPostfix }
    ],
    "output": "Ingredient",
    "colour": 120,
    "tooltip": "材料に分量と単位を指定します (例: 200 g)",
    "helpUrl": ""
});

// 単位 -> 数値（大さじ/小さじ/カップなど先にくる）
const ingredientMeasurePrefixBlock = (ingredientOptions: string[][]) => ({
    "type": "ingredient_measure_prefix_block",
    "message0": "材料: %1 %2 %3",
    "args0": [
        { "type": "field_searchable_dropdown", "name": "INGREDIENT_ID", "options": ingredientOptions },
        { "type": "field_dropdown", "name": "UNIT", "options": spoonUnits },
        { "type": "field_number", "name": "AMOUNT", "value": 0, "min": 0 }
    ],
    "output": "Ingredient",
    "colour": 120,
    "tooltip": "材料に分量と単位を指定します (例: 大さじ 2)",
    "helpUrl": ""
});

// 数値不要（少々・適量など）
const ingredientMeasureFreeBlock = (ingredientOptions: string[][]) => ({
    "type": "ingredient_measure_free_block",
    "message0": "材料: %1 %2",
    "args0": [
        { "type": "field_searchable_dropdown", "name": "INGREDIENT_ID", "options": ingredientOptions },
        { "type": "field_dropdown", "name": "UNIT", "options": freeAmountUnits }
    ],
    "output": "Ingredient",
    "colour": 120,
    "tooltip": "数値を伴わない分量を指定します (例: 適量)",
    "helpUrl": ""
});

// Define Action Block (Statement Block with Input)

const actionBlock = (actionOptions: string[][]) => ({
    "type": "action_block",
    "message0": "材料 %1 を %2",
    "args0": [
        {
            "type": "input_value",
            "name": "INGREDIENT_INPUT",
            "check": "Ingredient"
        },
        {
            "type": "field_searchable_dropdown",
            "name": "ACTION_ID",
            "options": actionOptions
        }
    ],
    "previousStatement": "Action", // Stacks with other Actions
    "nextStatement": "Action",
    "colour": 230,
    "tooltip": "調理アクションを選択してください",
    "helpUrl": ""
});

const groupSymbols = ['★', '◆', '●', '▲', '■', '▼'];

const groupIngredientBlock = {
    "type": "group_ingredient_block",
    "message0": "%1",
    "args0": [
        {
            "type": "field_dropdown",
            "name": "GROUP_SYMBOL",
            "options": groupSymbols.map(sym => [sym, `group:${sym}`])
        }
    ],
    "output": "Ingredient",
    "colour": 200,
    "tooltip": "まとめ記号を材料として扱います",
    "helpUrl": ""
};

const groupBlock = {
    "type": "group_block",
    "message0": "%1",
    "args0": [
        {
            "type": "field_dropdown",
            "name": "GROUP_SYMBOL",
            "options": groupSymbols.map(sym => [sym, sym])
        }
    ],
    "message1": "%1",
    "args1": [
        {
            "type": "input_statement",
            "name": "BODY",
            "check": "Action"
        }
    ],
    "previousStatement": "Action",
    "nextStatement": "Action",
    "colour": 280,
    "tooltip": "ブロックのまとまりを作ります",
    "helpUrl": ""
};

export const defineCustomBlocks = (data: RecipeData) => {
    const ingredientOptions = [['選択', ''], ...data.ingredients.map(ing => [ing.name, ing.id])];
    const actionOptions = [['選択', ''], ...data.actions.map(act => [act.name, act.id])];
    Blockly.common.defineBlocksWithJsonArray([
        ingredientBlock(ingredientOptions),
        ingredientMeasurePostfixBlock(ingredientOptions),
        ingredientMeasurePrefixBlock(ingredientOptions),
        ingredientMeasureFreeBlock(ingredientOptions),
        actionBlock(actionOptions),
        groupIngredientBlock,
        groupBlock,
    ]);
};
