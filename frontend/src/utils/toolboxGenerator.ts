import type { RecipeData } from '../data/mockData';

export const getToolbox = (_data: RecipeData, savedSnippets: string[] = []): string => {
    let toolboxXml = '<xml xmlns="https://developers.google.com/blockly/xml">';

  // Ingredients Category
  toolboxXml += '<category name="材料" colour="120">';
  toolboxXml += `
      <block type="ingredient_block"></block>
      <block type="ingredient_measure_postfix_block"></block>
      <block type="ingredient_measure_prefix_block"></block>
      <block type="ingredient_measure_free_block"></block>
      <block type="group_ingredient_block"></block>
      <block type="group_block">
        <field name="GROUP_SYMBOL">★</field>
      </block>
    `;
  toolboxXml += '</category>';

    // Actions Category
    toolboxXml += '<category name="手順" colour="230">';
    toolboxXml += `
      <block type="action_block"></block>
    `;
    toolboxXml += '</category>';

    if (savedSnippets.length > 0) {
        toolboxXml += '<category name="保存したセット" colour="300">';
        savedSnippets.forEach(snippetXml => {
            toolboxXml += snippetXml;
        });
        toolboxXml += '</category>';
    }

    toolboxXml += '</xml>';
    return toolboxXml;
};
