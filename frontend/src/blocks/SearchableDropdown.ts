import * as Blockly from 'blockly/core';

class SearchableDropdown extends Blockly.FieldDropdown {
    constructor(options: Blockly.MenuOption[]) {
        super(options);
    }

    static fromJson(options: any) {
        return new SearchableDropdown(options.options);
    }

    showEditor_(_?: Event) {
        const dropdownDiv = Blockly.DropDownDiv.getContentDiv();
        dropdownDiv.innerHTML = '';

        // Try to resolve allowed actions based on selected ingredient
        const allowedResolver = (globalThis as any).__allowedActionsResolver as
            | ((ingredientId: string) => { id: string }[])
            | undefined;
        const sourceBlock = this.sourceBlock_ as Blockly.Block | null;

        const findRootIngredient = (block: Blockly.Block | null): string | null => {
            if (!block) return null;
            const ingredientInput = (block as any).getInputTargetBlock?.('INGREDIENT_INPUT');
            if (ingredientInput) {
                if (ingredientInput.type === 'ingredient_block' ||
                    ingredientInput.type === 'ingredient_measure_postfix_block' ||
                    ingredientInput.type === 'ingredient_measure_prefix_block' ||
                    ingredientInput.type === 'ingredient_measure_free_block') {
                    return ingredientInput.getFieldValue('INGREDIENT_ID');
                }
                if (ingredientInput.type === 'group_ingredient_block') {
                    return ingredientInput.getFieldValue('GROUP_SYMBOL');
                }
            }
            const previous = (block as any).getPreviousBlock?.();
            if (previous && previous.type === 'action_block') {
                return findRootIngredient(previous);
            }
            return null;
        };

        const ingredientId = sourceBlock ? findRootIngredient(sourceBlock) : null;
        const allowedIds =
            ingredientId && !ingredientId.startsWith('group:') && allowedResolver
                ? new Set(allowedResolver(ingredientId).map(a => String(a.id)))
                : null;

        const input = document.createElement('input');
        input.placeholder = '検索...';
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.margin = '6px 0';
        input.style.padding = '8px';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid #ccc';

        const list = document.createElement('div');
        list.style.maxHeight = '180px';
        list.style.overflowY = 'auto';

        dropdownDiv.appendChild(input);
        dropdownDiv.appendChild(list);

        const render = (filter: string) => {
            list.innerHTML = '';
            const options = this.getOptions().filter(([label, value]) => {
                const matchesText = String(label).toLowerCase().includes(filter.toLowerCase());
                const allowed = allowedIds ? allowedIds.has(String(value)) : true;
                return matchesText && allowed;
            });
            options.forEach(([label, value]) => {
                const btn = document.createElement('div');
                btn.textContent = String(label);
                btn.style.padding = '8px 10px';
                btn.style.cursor = 'pointer';
                btn.onmouseenter = () => (btn.style.background = '#eef2ff');
                btn.onmouseleave = () => (btn.style.background = 'transparent');
                btn.onclick = () => {
                    this.setValue(String(value));
                    Blockly.DropDownDiv.hideIfOwner(this);
                };
                list.appendChild(btn);
            });
            if (options.length === 0) {
                if (filter) {
                    const addBtn = document.createElement('div');
                    addBtn.textContent = `"${filter}" を食材として追加`;
                    addBtn.style.padding = '8px 10px';
                    addBtn.style.cursor = 'pointer';
                    addBtn.style.color = '#2563eb';
                    addBtn.style.fontWeight = 'bold';
                    addBtn.onmouseenter = () => (addBtn.style.background = '#eef2ff');
                    addBtn.onmouseleave = () => (addBtn.style.background = 'transparent');
                    addBtn.onclick = () => {
                        const newOption: Blockly.MenuOption = [filter, filter];
                        const currentOptions = this.getOptions();
                        (this as any).menuGenerator_ = [...currentOptions, newOption];
                        this.setValue(filter);
                        Blockly.DropDownDiv.hideIfOwner(this);
                    };
                    list.appendChild(addBtn);
                } else {
                    const empty = document.createElement('div');
                    empty.textContent = '一致なし';
                    empty.style.padding = '8px 10px';
                    empty.style.color = '#666';
                    list.appendChild(empty);
                }
            }
        };

        input.addEventListener('input', () => render(input.value));
        render('');

        const primary = (this.sourceBlock_ as any)?.getColour?.() || '#455a64';
        Blockly.DropDownDiv.setColour(primary, '#cfd8dc');
        Blockly.DropDownDiv.showPositionedByField(this, () => {
            dropdownDiv.innerHTML = '';
        });

        // Focus after render
        setTimeout(() => input.focus(), 0);
    }
}

Blockly.fieldRegistry.register('field_searchable_dropdown', SearchableDropdown);

export { };
