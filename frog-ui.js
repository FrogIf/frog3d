// ----滑块----
function slider(container, options = {}){
    const sliderObj = {};
    function initDOM() {
        // 防止重复初始化
        sliderObj.container.innerHTML = '';

        // 外层容器
        sliderObj.wrapper = document.createElement('div');
        sliderObj.wrapper.className = 'frog-slider';
        sliderObj.wrapper.style.width = `${sliderObj.options.width}px`;
        sliderObj.wrapper.style.position = 'relative';

        // 轨道
        sliderObj.track = document.createElement('div');
        sliderObj.track.className = 'slider-track';
        sliderObj.track.style.height = '4px';
        sliderObj.track.style.background = '#ddd';
        sliderObj.track.style.borderRadius = '2px';
        sliderObj.track.style.cursor = 'pointer';
        sliderObj.track.style.position = 'relative';

        // 滑块
        sliderObj.thumb = document.createElement('div');
        sliderObj.thumb.className = 'slider-thumb';
        Object.assign(sliderObj.thumb.style, {
            position: 'absolute',
            width: '18px',
            height: '18px',
            background: '#007bff',
            border: '2px solid white',
            borderRadius: '50%',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'grab',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s'
        });

        // 数值显示（可选）
        if (sliderObj.options.showValue) {
            sliderObj.valueEl = document.createElement('div');
            sliderObj.valueEl.className = 'slider-value';
            sliderObj.valueEl.style.textAlign = 'center';
            sliderObj.valueEl.style.marginTop = '10px';
            sliderObj.valueEl.style.fontSize = '14px';
            sliderObj.valueEl.style.color = '#333';
        }

        // 组装
        sliderObj.track.appendChild(sliderObj.thumb);
        sliderObj.wrapper.appendChild(sliderObj.track);
        if (sliderObj.valueEl) sliderObj.wrapper.appendChild(sliderObj.valueEl);
        sliderObj.container.appendChild(sliderObj.wrapper);
    }

    function bindEvents() {
        const updateFromPosition = (clientX) => {
            const rect = sliderObj.track.getBoundingClientRect();
            let offsetX = clientX - rect.left;
            offsetX = Math.max(0, Math.min(rect.width, offsetX));
            const ratio = offsetX / rect.width;
            const value = sliderObj.options.min + ratio * (sliderObj.options.max - sliderObj.options.min);
            sliderObj.setValue(value);
        };

        // 点击轨道
        sliderObj.track.addEventListener('click', (e) => {
            updateFromPosition(e.clientX);
        });

        // 拖拽
        let isDragging = false;
        sliderObj.thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            sliderObj.thumb.style.cursor = 'grabbing';
            sliderObj.thumb.style.transform = 'translateY(-50%) scale(1.1)';
            e.preventDefault();
        });

        const onMouseMove = (e) => {
            if (!isDragging) return;
            updateFromPosition(e.clientX);
        };

        const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            sliderObj.thumb.style.cursor = 'grab';
            sliderObj.thumb.style.transform = 'translateY(-50%)';
        }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 清理事件（避免内存泄漏）
        sliderObj._cleanup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            updateFromPosition(e.touches[0].clientX);
        };

        const onTouchEnd = () => {
            isDragging = false;
        };

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);

        // 合并清理函数
        const originalCleanup = sliderObj._cleanup;
        sliderObj._cleanup = () => {
            originalCleanup();
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }

    function setValue(value) {
        const clamped = Math.max(sliderObj.options.min, Math.min(sliderObj.options.max, value));
        sliderObj._value = clamped;
        const ratio = (clamped - sliderObj.options.min) / (sliderObj.options.max - sliderObj.options.min);
        sliderObj.thumb.style.left = `calc(${ratio * 100}% - ${sliderObj.thumb.offsetWidth / 2}px)`;
        if (sliderObj.valueEl) {
            sliderObj.valueEl.textContent = Math.round(clamped);
        }
        if (sliderObj.options.onChange) {
            sliderObj.options.onChange(clamped);
        }
    }

    function getValue() {
        return sliderObj._value;
    }

    function destroy() {
        if (sliderObj._cleanup) sliderObj._cleanup();
        if (sliderObj.wrapper.parentNode) {
            sliderObj.wrapper.parentNode.removeChild(sliderObj.wrapper);
        }
    }

    function init(){
        sliderObj.options = {
            min: 0,
            max: 100,
            value: 50,
            width: 300,
            showValue: true,
            onChange: null,
            ...options
        };

        // 创建 DOM
        sliderObj.container = typeof container === 'string' ? document.querySelector(container) : container;

        if (!sliderObj.container) throw new Error('Slider container not found');

        initDOM();
        bindEvents();
        setValue(sliderObj.options.value);
    }

    init();

    sliderObj.setValue = setValue;
    sliderObj.getValue = getValue;
    sliderObj.destroy = destroy;
    return slider;
}

// ----开关----
function toggleSwitch(container, options = {}){
    const switchObj = {};

    function initDOM() {
        switchObj.container.innerHTML = '';

        // 外层容器
        switchObj.wrapper = document.createElement('div');
        switchObj.wrapper.className = 'frog-toggle-wrapper';
        switchObj.wrapper.style.display = 'inline-flex';
        switchObj.wrapper.style.alignItems = 'center';
        switchObj.wrapper.style.gap = '8px';

        // 开关本体
        switchObj.switchEl = document.createElement('button');
        Object.assign(switchObj.switchEl, {
            type: 'button',
            role: 'switch',
            className: 'frog-toggle-switch',
            tabIndex: 0
        });

        Object.assign(switchObj.switchEl.style, {
            width: `${switchObj.options.width}px`,
            height: `${switchObj.options.height}px`,
            background: '#ccc',
            border: 'none',
            borderRadius: '12px',
            position: 'relative',
            cursor: switchObj.options.disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease',
            outline: 'none',
            padding: '0'
        });

        // 小圆点（thumb）
        switchObj.thumb = document.createElement('div');
        Object.assign(switchObj.thumb.style, {
            width: `${switchObj.options.height - switchObj.options.height/6}px`,
            height: `${switchObj.options.height - switchObj.options.height/6}px`,
            background: '#fff',
            borderRadius: '50%',
            position: 'absolute',
            top: '2px',
            left: '2px',
            transition: 'transform 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        });

        switchObj.switchEl.appendChild(switchObj.thumb);

        // 标签（可选）
        if (switchObj.options.showLabels) {
            switchObj.labelEl = document.createElement('span');
            switchObj.labelEl.className = 'frog-toggle-label';
            switchObj.labelEl.style.fontSize = '14px';
            switchObj.labelEl.style.color = '#333';
        }

        switchObj.wrapper.appendChild(switchObj.switchEl);
        if (switchObj.labelEl) switchObj.wrapper.appendChild(switchObj.labelEl);
        switchObj.container.appendChild(switchObj.wrapper);

        if (switchObj.options.disabled) {
            switchObj.switchEl.setAttribute('disabled', 'true');
            switchObj.switchEl.style.opacity = '0.6';
        }
    }

    function bindEvents() {
        if (switchObj.options.disabled) return;

        const handleClick = () => {
            switchObj.setChecked(!switchObj._checked);
        };

        switchObj.switchEl.addEventListener('click', handleClick);
        switchObj.switchEl.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                handleClick();
            }
        });

        switchObj._cleanup = () => {
            switchObj.switchEl.removeEventListener('click', handleClick);
        };
    }

    function setChecked(isChecked) {
        switchObj._checked = Boolean(isChecked);

        // 更新视觉
        if (switchObj._checked) {
            switchObj.switchEl.style.background = '#007bff';
            switchObj.thumb.style.transform = `translateX(${switchObj.options.width - switchObj.options.height - 1}px)`;
        } else {
            switchObj.switchEl.style.background = '#ccc';
            switchObj.thumb.style.transform = 'translateX(0)';
        }

        // 更新 aria
        switchObj.switchEl.setAttribute('aria-checked', switchObj._checked);

        // 更新标签
        if (switchObj.labelEl) {
            switchObj.labelEl.textContent = switchObj._checked ? switchObj.options.onText : switchObj.options.offText;
        }

        // 回调
        if (switchObj.options.onChange) {
            switchObj.options.onChange(switchObj._checked);
        }
    }

    function getChecked() {
        return switchObj._checked;
    }

    function destroy() {
        if (switchObj._cleanup) switchObj._cleanup();
        if (switchObj.wrapper.parentNode) {
            switchObj.wrapper.parentNode.removeChild(switchObj.wrapper);
        }
    }

    function init(){
        switchObj.options = {
            checked: false,
            disabled: false,
            showLabels: false,
            onText: 'ON',
            offText: 'OFF',
            onChange: null,
            width: 48,
            height: 24,
            ...options
        };

        switchObj.container = typeof container === 'string' ? document.querySelector(container) : container;
        
        if (!switchObj.container) throw new Error('ToggleSwitch container not found');

        initDOM();
        bindEvents();
        setChecked(switchObj.options.checked);
    }

    init();

    switchObj.destroy = destroy;
    switchObj.setChecked = setChecked;
    switchObj.getChecked = getChecked;
    return switchObj;
}

// ----折叠组---
function collapsible(container, options = {}){
    const collapsibleObj = {};

    function initDOM() {
        // 清空容器，我们将重建结构
        collapsibleObj.container.innerHTML = '';

        // 外层 wrapper
        collapsibleObj.wrapper = document.createElement('div');
        collapsibleObj.wrapper.className = 'frog-collapsible';
        collapsibleObj.wrapper.style.border = '1px solid #ddd';
        collapsibleObj.wrapper.style.borderRadius = '6px';
        collapsibleObj.wrapper.style.fontFamily = 'sans-serif';
        collapsibleObj.wrapper.style.width = '100%';

        // 创建标题栏
        collapsibleObj.header = document.createElement('div');
        Object.assign(collapsibleObj.header.style, {
            padding: '10px 14px',
            background: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: '500',
            color: '#333',
            userSelect: 'none'
        });

        // 确定标题文本
        let titleText = collapsibleObj.options.title;
        if (!titleText && collapsibleObj.originalChildren.length > 0) {
            // 尝试从第一个文本节点或元素提取
            const firstNode = collapsibleObj.originalChildren[0];
            if (firstNode.nodeType === Node.TEXT_NODE) {
                titleText = firstNode.textContent.trim() || 'Panel';
            } else if (firstNode.nodeType === Node.ELEMENT_NODE) {
                titleText = firstNode.textContent.trim() || 'Panel';
            }
        }
        titleText = titleText || 'Panel';

        collapsibleObj.titleEl = document.createElement('span');
        collapsibleObj.titleEl.textContent = titleText;

        collapsibleObj.arrowEl = document.createElement('span');
        collapsibleObj.arrowEl.textContent = collapsibleObj.options.collapseText;
        collapsibleObj.arrowEl.style.transition = 'transform 0.2s ease';
        collapsibleObj.arrowEl.style.fontSize = '12px';
        collapsibleObj.arrowEl.style.color = '#777';

        collapsibleObj.header.appendChild(collapsibleObj.titleEl);
        collapsibleObj.header.appendChild(collapsibleObj.arrowEl);

        // 内容区域：把原始子节点（除可能的标题）放进去
        collapsibleObj.contentWrapper = document.createElement('div');
        Object.assign(collapsibleObj.contentWrapper.style, {
            maxHeight: '0',
            overflow: 'hidden',
            transition: 'max-height 0.25s ease',
            padding: '0 14px'
        });

        // 决定哪些节点属于“内容”
        let contentNodes = collapsibleObj.originalChildren;
        if (!collapsibleObj.options.title && collapsibleObj.originalChildren.length > 0) {
            // 如果标题是从第一个子节点提取的，就跳过它
            const first = collapsibleObj.originalChildren[0];
            if (first.nodeType === Node.ELEMENT_NODE || first.nodeType === Node.TEXT_NODE) {
                contentNodes = collapsibleObj.originalChildren.slice(1);
            }
        }

        // 克隆并添加内容节点（避免移动原节点导致意外）
        contentNodes.forEach(node => {
          collapsibleObj.contentWrapper.appendChild(node.cloneNode(true));
        });

        // 组装
        collapsibleObj.wrapper.appendChild(collapsibleObj.header);
        collapsibleObj.wrapper.appendChild(collapsibleObj.contentWrapper);
        collapsibleObj.container.appendChild(collapsibleObj.wrapper);
    }

    function bindEvents() {
        collapsibleObj.header.addEventListener('click', () => collapsibleObj.toggle());
        collapsibleObj.header.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            collapsibleObj.toggle();
        }
        });
    }

    function toggle() {
        collapsibleObj.setExpanded(!collapsibleObj._expanded);
    }

    function setExpanded(expanded) {
        collapsibleObj._expanded = Boolean(expanded);

        if (collapsibleObj._expanded) {
            collapsibleObj.contentWrapper.style.maxHeight = collapsibleObj.contentWrapper.scrollHeight + 'px';
            collapsibleObj.arrowEl.textContent = collapsibleObj.options.expandedText;
            collapsibleObj.header.setAttribute('aria-expanded', 'true');
        } else {
            collapsibleObj.contentWrapper.style.maxHeight = '0';
            collapsibleObj.arrowEl.textContent = collapsibleObj.options.collapseText;
            collapsibleObj.header.setAttribute('aria-expanded', 'false');
        }

        if (collapsibleObj.options.onToggle) {
            collapsibleObj.options.onToggle(collapsibleObj._expanded);
        }
    }

    function getExpanded() {
        return collapsibleObj._expanded;
    }

    function destroy() {
        // 恢复原始内容（可选）
        collapsibleObj.container.innerHTML = '';
        collapsibleObj.originalChildren.forEach(node => {
            collapsibleObj.container.appendChild(node.cloneNode(true));
        });
    }

    collapsibleObj.setExpanded = setExpanded;
    collapsibleObj.destroy = destroy;
    collapsibleObj.getExpanded = getExpanded;
    collapsibleObj.toggle = toggle;

    function init(){
        collapsibleObj.options = {
            collapseText: '▼',
            expandedText: '▲',
            title: '',          // 若为空，则尝试从第一个子元素提取文本
            expanded: true,
            onToggle: null,
            ...options
        };

        collapsibleObj.container = typeof container === 'string' ? document.querySelector(container) : container;

        if (!collapsibleObj.container) throw new Error('Collapsible container not found');

        // 保存原始子节点（即用户写的 HTML 内容）
        collapsibleObj.originalChildren = Array.from(collapsibleObj.container.childNodes);

        initDOM();
        bindEvents();
        collapsibleObj.setExpanded(collapsibleObj.options.expanded);
    }

    init();

    return collapsibleObj;
}

function messageBubble(msg, options = {}){
    const opt = {
        backgroundColor: 'green',
        color: 'white',
        zIndex: 9999,
        timeout: 2000,
        ...options
    };
    const div = document.createElement('div');
    div.innerText = msg;
    div.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);background:${opt.backgroundColor};color:${opt.color};padding:8px;z-index:${opt.zIndex};`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), opt.timeout);
}

// --- eye button ---
function eyeButton(container, options = {}){
    container.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>';
    container.classList.add('eye-button');
}