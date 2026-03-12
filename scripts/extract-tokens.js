// extract-tokens.js
// 用于 agent-browser eval 提取全局 CSS 变量 & Ant Design Token
// 使用方式: agent-browser eval "$(cat scripts/extract-tokens.js)" > tokens.json

(() => {
  const styles = getComputedStyle(document.documentElement);
  const tokens = {};
  for (const prop of styles) {
    if (prop.startsWith('--')) {
      tokens[prop] = styles.getPropertyValue(prop).trim();
    }
  }
  const antKeys = [
    'colorPrimary','colorSuccess','colorWarning','colorError','colorInfo',
    'colorTextBase','colorBgBase','colorBorder','colorBgContainer',
    'colorBgLayout','colorBgElevated','colorText','colorTextSecondary',
    'colorTextTertiary','colorTextDisabled','colorFill','colorFillSecondary',
    'borderRadius','borderRadiusLG','borderRadiusSM','borderRadiusXS',
    'fontSize','fontSizeLG','fontSizeSM','fontSizeXL',
    'lineHeight','lineHeightLG','lineHeightSM',
    'fontFamily','fontWeightStrong',
    'boxShadow','boxShadowSecondary','boxShadowTertiary',
    'controlHeight','controlHeightLG','controlHeightSM',
    'paddingContentHorizontal','paddingContentVertical',
    'marginXXS','marginXS','marginSM','margin','marginMD','marginLG','marginXL',
    'paddingXXS','paddingXS','paddingSM','padding','paddingMD','paddingLG','paddingXL',
  ];
  const antTokens = {};
  antKeys.forEach(key => {
    const cssVar = '--ant-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    const val = styles.getPropertyValue(cssVar).trim();
    if (val) antTokens[key] = val;
  });
  return JSON.stringify({ cssVariables: tokens, antTokens }, null, 2);
})();
