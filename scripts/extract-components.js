// extract-components.js
// 用于 agent-browser eval 提取组件样式（含交互状态模拟）
// 使用方式: agent-browser eval "$(cat scripts/extract-components.js)" > components_page.json

(async () => {
  const componentSelectors = [
    'ant-btn','ant-input','ant-select','ant-table','ant-modal',
    'ant-form','ant-form-item','ant-menu','ant-tabs','ant-tag','ant-badge',
    'ant-card','ant-alert','ant-tooltip','ant-dropdown',
    'ant-checkbox','ant-radio','ant-switch','ant-pagination',
    'ant-date-picker','ant-upload','ant-spin'
  ];

  function snapshot(el) {
    const s = getComputedStyle(el);
    return {
      color: s.color, backgroundColor: s.backgroundColor,
      borderColor: s.borderColor, borderWidth: s.borderWidth,
      borderRadius: s.borderRadius, boxShadow: s.boxShadow,
      fontSize: s.fontSize, fontWeight: s.fontWeight,
      lineHeight: s.lineHeight, fontFamily: s.fontFamily,
      padding: s.padding, height: s.height, opacity: s.opacity,
      outline: s.outline, outlineColor: s.outlineColor,
    };
  }

  async function captureStates(el) {
    const states = { default: snapshot(el) };

    // Hover
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    states.hover = snapshot(el);
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));

    // Focus
    el.focus?.();
    await new Promise(r => setTimeout(r, 50));
    states.focus = snapshot(el);
    el.blur?.();

    // Active
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    states.active = snapshot(el);
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    return states;
  }

  const result = {};
  const promises = [];

  componentSelectors.forEach(comp => {
    const els = document.querySelectorAll(`[class*="${comp}"]`);
    if (!els.length) return;
    result[comp] = {};
    els.forEach(el => {
      const key = [...el.classList].filter(c => c.startsWith(comp)).join(' ') || comp;
      if (result[comp][key]) return;
      promises.push(
        captureStates(el).then(states => { result[comp][key] = states; })
      );
    });
  });

  await Promise.all(promises);
  return JSON.stringify(result, null, 2);
})();
