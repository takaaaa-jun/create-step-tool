import React, { useEffect, useRef, useState } from 'react';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import 'blockly/javascript'; // Or python, or just for types
import * as En from 'blockly/msg/en';
import { defineCustomBlocks } from '../blocks/customBlocks';
import { getToolbox } from '../utils/toolboxGenerator';
import { fetchRecipeData } from '../data/mockData';
import type { RecipeData } from '../data/mockData';

Blockly.setLocale(En as any);

interface BlocklyComponentProps {
    recipeId: string;
    onWorkspaceChange?: (workspace: Blockly.WorkspaceSvg) => void;
    onSummaryChange?: (items: { name: string; amount: number; unit: string; groupSymbol?: string }[]) => void;
}

const BlocklyComponent: React.FC<BlocklyComponentProps> = ({ recipeId, onWorkspaceChange, onSummaryChange }) => {
    const blocklyDiv = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const [recipeData, setRecipeData] = useState<RecipeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [savedSnippets] = useState<{ name: string; xml: string }[]>([]);

    useEffect(() => {
        // Load recipe data from API
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchRecipeData(recipeId);
                setRecipeData(data);
            } catch (err) {
                console.error('Failed to load recipe data', err);
                alert('レシピデータの取得に失敗しました。');
                setRecipeData(null);
            }
            setLoading(false);
        };
        load();
    }, [recipeId]);

    useEffect(() => {
        if (!blocklyDiv.current || !recipeData) return;

        // Expose allowed actions resolver for custom dropdown on global scope
        // Expose allowed actions resolver for custom dropdown on global scope
        (globalThis as any).__allowedActionsResolver = (ingredientId: string) => {
            const isKnown = recipeData.ingredients.some(i => i.id === ingredientId);
            if (!isKnown && !ingredientId.startsWith('group:')) {
                return recipeData.actions;
            }
            return recipeData.getAllowedActions(ingredientId);
        };

        // Define blocks with dynamic data
        defineCustomBlocks(recipeData);

        // Inject workspace
        workspaceRef.current = Blockly.inject(blocklyDiv.current, {
            toolbox: getToolbox(recipeData, savedSnippets.map(s => s.xml)),
            scrollbars: true,
            trashcan: true,
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2,
            },
        });

        // Load saved state
        const savedState = localStorage.getItem('blockly_workspace_backup');
        if (savedState) {
            try {
                Blockly.serialization.workspaces.load(JSON.parse(savedState), workspaceRef.current);
            } catch (e) {
                console.warn('Failed to load saved workspace', e);
            }
        }

        // Validation Logic for moves and field changes
        const updateSummary = () => {
            if (!workspaceRef.current) return;
            const allBlocks = workspaceRef.current.getAllBlocks(false);
            const map = new Map<string, { name: string; amount: number; unit: string; groupSymbol?: string }>();

            const getName = (id: string) => {
                const found = recipeData.ingredients.find((ing) => ing.id === id);
                return found ? found.name : id || '未選択';
            };

            const findGroupSymbol = (block: Blockly.Block | null): string | null => {
                let current: Blockly.Block | null = block;
                while (current) {
                    const parent = current.getParent?.() || (current as any).getSurroundParent?.();
                    if (parent && parent.type === 'group_block') {
                        return parent.getFieldValue('GROUP_SYMBOL') || null;
                    }
                    current = parent || null;
                }
                return null;
            };

            allBlocks.forEach((b) => {
                if (b.type === 'ingredient_block' || b.type === 'group_ingredient_block' ||
                    b.type === 'ingredient_measure_postfix_block' ||
                    b.type === 'ingredient_measure_prefix_block' ||
                    b.type === 'ingredient_measure_free_block') {
                    let id = b.getFieldValue('INGREDIENT_ID') || '';
                    if (b.type === 'group_ingredient_block') {
                        return; // 記号単体はスキップ
                    }
                    const groupSymbol = findGroupSymbol(b);
                    const name = getName(id);
                    let unit = '';
                    let amount = 1;
                    if (b.type === 'ingredient_measure_postfix_block') {
                        unit = b.getFieldValue('UNIT') || '';
                        amount = Number(b.getFieldValue('AMOUNT') || 0) || 0;
                    } else if (b.type === 'ingredient_measure_prefix_block') {
                        unit = b.getFieldValue('UNIT') || '';
                        amount = Number(b.getFieldValue('AMOUNT') || 0) || 0;
                    } else if (b.type === 'ingredient_measure_free_block') {
                        unit = b.getFieldValue('UNIT') || '';
                        amount = 0; // 表示専用
                    }
                    const key = `${groupSymbol || ''}|${name}|${unit}`;
                    const current = map.get(key) || { name, amount: 0, unit, groupSymbol: groupSymbol || undefined };
                    current.amount += amount;
                    map.set(key, current);
                }
            });

            const arr = Array.from(map.values());
            onSummaryChange?.(arr);
        };

        const onBlockChange = (event: Blockly.Events.Abstract) => {
            const workspace = workspaceRef.current;
            if (!workspace) return;

            if (event.type === Blockly.Events.BLOCK_MOVE) {
                const moveEvent = event as Blockly.Events.BlockMove;
                const block = workspace.getBlockById(moveEvent.blockId!);
                if (!block) return;

                const isIngredient = [
                    'ingredient_block',
                    'ingredient_measure_postfix_block',
                    'ingredient_measure_prefix_block',
                    'ingredient_measure_free_block',
                    'group_ingredient_block',
                ].includes(block.type);

                if (isIngredient && moveEvent.newParentId) {
                    // Ingredient connected to Action
                    const parentBlock = workspace.getBlockById(moveEvent.newParentId);
                    if (parentBlock && parentBlock.type === 'action_block') {
                        const ingredientId = block.getFieldValue('INGREDIENT_ID');
                        const actionId = parentBlock.getFieldValue('ACTION_ID');
                        validateConnection(parentBlock, ingredientId, actionId);
                    }
                } else if (block.type === 'action_block') {
                    // Action connected/moved within stack
                    const ingredientId = findRootIngredient(block);
                    const actionId = block.getFieldValue('ACTION_ID');
                    if (ingredientId) {
                        validateConnection(block, ingredientId, actionId);
                    }
                }
            } else if (event.type === Blockly.Events.BLOCK_CHANGE) {
                const changeEvent = event as Blockly.Events.BlockChange;
                if (changeEvent.element === 'field' && changeEvent.name === 'ACTION_ID') {
                    const block = workspace.getBlockById(changeEvent.blockId!);
                    if (!block) return;
                    const ingredientId = findRootIngredient(block);
                    const actionId = String(changeEvent.newValue);
                    if (ingredientId) {
                        const isValid = validateConnection(block, ingredientId, actionId, true);
                        // If invalid, revert to old action if available
                        if (!isValid && changeEvent.oldValue) {
                            block.setFieldValue(changeEvent.oldValue, 'ACTION_ID');
                        }
                    }
                }
            }

            // Save state
            const state = Blockly.serialization.workspaces.save(workspace);
            localStorage.setItem('blockly_workspace_backup', JSON.stringify(state));

            updateSummary();
        };

        const findRootIngredient = (block: Blockly.Block): string | null => {
            // 1. Check if this block has an ingredient input
            const ingredientInput = block.getInputTargetBlock('INGREDIENT_INPUT');
            if (ingredientInput && (
                ingredientInput.type === 'ingredient_block' ||
                ingredientInput.type === 'ingredient_measure_postfix_block' ||
                ingredientInput.type === 'ingredient_measure_prefix_block' ||
                ingredientInput.type === 'ingredient_measure_free_block' ||
                ingredientInput.type === 'group_ingredient_block'
            )) {
                return ingredientInput.getFieldValue('INGREDIENT_ID');
            }
            // 2. If not, traverse up
            const previousBlock = block.getPreviousBlock();
            if (previousBlock && previousBlock.type === 'action_block') {
                return findRootIngredient(previousBlock);
            }
            return null;
        };

        const validateConnection = (block: Blockly.Block, ingredientId: string, actionId: string, suppressDisconnect = false) => {
            if (!actionId || !ingredientId) {
                return true; // allow empty selection
            }

            // group:* は自由に組み合わせられる
            if (ingredientId.startsWith('group:')) {
                return true;
            }
            // Check if ingredient is known
            const isKnown = recipeData.ingredients.some(i => i.id === ingredientId);
            if (!isKnown) {
                return true; // Allow custom ingredients
            }

            const allowedActions = recipeData.getAllowedActions(ingredientId);
            const isAllowed = allowedActions.some(a => a.id === actionId);

            if (!isAllowed) {
                console.warn(`Action ${actionId} not allowed for ingredient ${ingredientId}`);
                // Disconnect based on what was just connected? 
                // It's hard to know exactly which connection caused the issue without more context,
                // but we can at least alert.
                // If we want to disconnect, we need to know if it was the ingredient that was added or the action that was stacked.

                alert(`この食材 (${ingredientId}) に "${actionId}" はできません！`);

                if (!suppressDisconnect) {
                    // Simple disconnect strategy: if ingredient is direct child, disconnect it.
                    // If it's a stack, disconnect this block from previous.
                    const ingredientInput = block.getInputTargetBlock('INGREDIENT_INPUT');
                    if (ingredientInput && ingredientInput.getFieldValue('INGREDIENT_ID') === ingredientId) {
                        block.getInput('INGREDIENT_INPUT')?.connection?.disconnect();
                    } else {
                        block.previousConnection?.disconnect();
                    }
                }
            }
            return isAllowed;
        };
        workspaceRef.current.addChangeListener(onBlockChange);
        updateSummary();

        if (onWorkspaceChange && workspaceRef.current) {
            onWorkspaceChange(workspaceRef.current);
        }

        return () => {
            if (workspaceRef.current) {
                workspaceRef.current.dispose();
            }
        };
    }, [recipeData]);

    return (
        <div className="builder-panel">
            {loading && <p style={{ textAlign: 'center' }}>読み込み中...</p>}
            {!loading && !recipeData && (
                <p style={{ textAlign: 'center', color: '#ffb4b4' }}>
                    レシピデータを読み込めませんでした。API が動いているか確認してください。
                </p>
            )}
            <div
                ref={blocklyDiv}
                style={{ width: '100%', height: '80vh', margin: '0 auto', background: '#0f1116', borderRadius: 12 }}
            />
        </div>
    );
};

export default BlocklyComponent;
