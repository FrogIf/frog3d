/**
 * 2.5d
 */
function frog3d(dom, options){
  const frogObj = {}; // 对象
  const points = []; // 点集合
  const pathList = []; // 路径集合
  const mouseTracePoints = []; // 鼠标轨迹集合

  const config = {
    xOffset: 0,
    yOffset: 0,
    dom: dom,
    grid: true, // 显示网格
    axesHelper: true, // 显示轴
    unitVector: true,
    debug: true,
    gridLineType: 'dot', // solid - 实线; dot - 点线
    gapScale: 40,
    scale: 1,
    style: {
      background: '#FCFCFC', // 背景色
      color: '#121212', // 前景色
      grid: '#999999' // 网格颜色
    },
    ...options
  };

  // 初始化坐标系统
  function initCoorSystem(){
    config.xv = config.xv??[1, 0];
    config.yv = config.yv??[0, 1];

    const v1 = [config.xv[0] * config.scale, config.xv[1] * config.scale];
    const vv1 = [-v1[1], v1[0]]; // v1的其中一个垂向量
    const v2 = [config.yv[0] * config.scale, config.yv[1] * config.scale];
    const vv2 = [-v2[1], v2[0]]; // v2的其中一个垂向量
    let gap = Math.abs(projectScalar(v1[0], v1[1], vv2[0], vv2[1])) * config.gapScale;
    config.xGridGap = gap == 0 ? 10 : gap; // x网格(纵向网格)间距
    gap = Math.abs(projectScalar(v2[0], v2[1], vv1[0], vv1[1])) * config.gapScale;
    config.yGridGap = gap == 0 ? 10 : gap ; // y网格(横向网格)间距

    config.inverseMatrix = inverseMatrix([config.xv, config.yv]);
  }
  /**
   * 初始化
   */
  function init(){
    initCoorSystem();
    config._localDom = config.dom;
    const container = document.createElement('canvas');
    config.dom.appendChild(container);
    config.ctx = container.getContext('2d');
    config.container = container;

    resize();
    render();

    // 鼠标按下
    container.addEventListener('mousedown', (e) => {
      const mouse = getMousePos(e);
      if(config.axesHelper){
        if (isPointInCircle(mouse.x, mouse.y, toAxesHelperViewCoordinate(config.xv), 12)) {
          config.container.style.cursor = 'grabbing';
          config.dragCircle = config.xv;
          return;
        }else if(isPointInCircle(mouse.x, mouse.y, toAxesHelperViewCoordinate(config.yv), 12)){
          config.container.style.cursor = 'grabbing';
          config.dragCircle = config.yv;
          return;
        }
      }

      config.container.style.cursor = 'auto';
      config.targetX = mouse.x;
      config.targetY = mouse.y;
      config.mousedownOriginX = config.xOffset;
      config.mousedownOriginY = config.yOffset;
      config.dragging = true;
    });
    // 鼠标移动
    container.addEventListener('mousemove', (e) => {
      if (config.dragCircle) {
        const mouse = getMousePos(e);
        const x = Math.min(config.width - 12, Math.max(12, mouse.x));
        const y = Math.min(config.height - 12, Math.max(12, mouse.y));
        const coor = fromAxesHelperViewCoordinate([x, y]);
        config.dragCircle[0] = coor[0];
        config.dragCircle[1] = coor[1];
        initCoorSystem();
        render();
      }else if(config.dragging){
        const mouse = getMousePos(e);
        config.xOffset = Math.round(config.mousedownOriginX + (mouse.x - config.targetX));
        config.yOffset = Math.round(config.mousedownOriginY + (mouse.y - config.targetY));
        mouseTracePoints.length = 0;
        render();
      }else if(config.mouseTrace){  // 显示鼠标移动轨迹
        const mouse = getMousePos(e);
        // 像素坐标系转逻辑坐标系
        const [ix, iy] = inverseCoordinateTransform(mouse.x, mouse.y);

        const xstep = Math.floor(ix / config.gapScale);
        const ystep = Math.floor(iy / config.gapScale);
        // 计算四点像素坐标
        const c1 = coordinateTransform(xstep * config.gapScale, ystep * config.gapScale);
        const c2 = coordinateTransform((xstep + 1) * config.gapScale, ystep * config.gapScale);
        const c3 = coordinateTransform((xstep + 1) * config.gapScale, (ystep + 1) * config.gapScale);
        const c4 = coordinateTransform(xstep * config.gapScale, (ystep + 1) * config.gapScale);

        let t = false;
        if(mouseTracePoints.length > 0){
          const tailStart = mouseTracePoints[mouseTracePoints.length - 1][0];
          if(tailStart[0] !== c1[0] || tailStart[1] !== c1[1]){
            t = true;
          }
        }else{
          t = true;
        }
        if(t){
          mouseTracePoints.push([c1, c2, c3, c4]);
          if(mouseTracePoints.length > 6){ // 固定队列长度为6
            mouseTracePoints.shift(); // 移除队首
          }
          render();
        }
      }
    });

    // 鼠标松开
    container.addEventListener('mouseup', () => {
      if (config.dragCircle) {
        config.dragCircle = null;
        config.container.style.cursor = 'auto';
      }
      config.dragging = false;
    });
    // 鼠标离开画布也要取消拖动（防止 mouseup 丢失）
    container.addEventListener('mouseleave', () => {
      config.dragCircle = null;
      config.container.style.cursor = 'auto';
      config.dragging = false;
    });

    container.addEventListener('mousewheel', (e) => {
      e.preventDefault();

      if(e.wheelDelta){
        const mouse = getMousePos(e);
        // 像素坐标系转逻辑坐标系
        const [ix, iy] = inverseCoordinateTransform(mouse.x, mouse.y);

        const scaleOffset = e.wheelDelta > 0 ? config.scale / 10 : -(config.scale / 10);
        const scale = config.scale + scaleOffset;
        config.scale = Math.min(3, Math.max(scale, 0.2));

        config.xOffset = mouse.x - (config.xv[0] * ix + config.yv[0] * iy) * config.scale;
        config.yOffset = mouse.y - (config.xv[1] * ix + config.yv[1] * iy) * config.scale;
        
        mouseTracePoints.length = 0;
        initCoorSystem();
        render();
      }
    }, {passive: false});
  }

  // 判断点 (mx, my) 是否在圆内
  function isPointInCircle(mx, my, coor, r) {
    const dx = mx - coor[0];
    const dy = my - coor[1];
    return dx * dx + dy * dy <= r * r;
  }

  function resize(){
    const wrapDomStyle = getComputedStyle(config.dom);
    const dpr = window.devicePixelRatio || 1;
    const w = Number.parseInt(wrapDomStyle.width, 10);
    const h = Number.parseInt(wrapDomStyle.height, 10);
    config.container.width = w * dpr;
    config.container.height = h * dpr;
    config.container.style.width = w + 'px';
    config.container.style.height = h + 'px';
    config.width = config.container.width;
    config.height = config.container.height;
  }

  /**
   * 获取鼠标位置
   * @param {*} event 鼠标移动事件 
   * @returns 
   */
  function getMousePos(event){
      const rect = config.container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      return {
          x: (event.clientX - rect.left) * dpr,
          y: (event.clientY - rect.top) * dpr
      };
  }

  // 绘制路径
  function renderPath(){
    if(pathList.length > 0){
      const ctx = config.ctx;
      for(let path of pathList){
        ctx.beginPath();
        ctx.lineWidth = path.width??2;
        const arr = path.data;
        const c = coordinateTransform(arr[0][0], arr[0][1]);
        let gradient = null;
        if(path.gradient){
          let maxX = Number.MIN_SAFE_INTEGER;
          let minX = Number.MAX_SAFE_INTEGER;
          let maxY = Number.MIN_SAFE_INTEGER;
          let minY = Number.MAX_SAFE_INTEGER;
          for(let p of arr){
            minX = Math.min(p[0], minX);
            maxX = Math.max(p[0], maxX);
            minY = Math.min(p[1], minY);
            maxY = Math.max(p[1], maxY);
          }
          const g1 = coordinateTransform(minX, minY);
          const g2 = coordinateTransform(maxX, maxY);
          gradient = ctx.createLinearGradient(g1[0], g1[1], g2[0], g2[1]);
          let step = 1 / (path.gradient.length - 1);
          gradient.addColorStop(0, path.gradient[0]);
          for(let i = 1; i < path.gradient.length - 1; i++){
            gradient.addColorStop(i * step, path.gradient[i]);
          }
          gradient.addColorStop(1, path.gradient[path.gradient.length - 1]);
        }
        if(gradient){
          ctx.strokeStyle = gradient;
        }else{
          ctx.strokeStyle = path.strokeStyle??'#121212';
        }
        ctx.moveTo(c[0], c[1]);
        for(let i = 1; i < arr.length; i++){
          const c2 = coordinateTransform(arr[i][0], arr[i][1]);
          ctx.lineTo(c2[0], c2[1]);
        }
        ctx.stroke();
      }
    }
  }

  function parsePercentage(str) {
    if (typeof str !== 'string') return null;
    
    const trimmed = str.trim();
    if(trimmed.endsWith('%')){
      const numberStr = trimmed.slice(0, -1);
      const v = Number.parseFloat(numberStr);
      return Number.isFinite(v) ? (v / 100) : null;
    }
    return null;
  }

  // 绘制图片
  function renderImage(){
    if(points.length > 0){
      const ctx = config.ctx;
      for(let pp of points){
        if(!pp.imgReady){ continue; }
        const coor = coordinateTransform(pp.x, pp.y);
        // , hAlign: hAlign, vAlign: vAlign
        let x = coor[0];
        let y = coor[1];
        const w = pp.img.width * pp.imgScale * config.scale;
        const h = pp.img.height * pp.imgScale * config.scale;
        let ns = parsePercentage(pp.hAlign);
        if(pp.hAlign == 'center'){
          x -= w/2;
        }else if(pp.hAlign == 'right'){
          x -= w;
        }else if(ns){
          x -= ns * w;
        }
        ns = parsePercentage(pp.vAlign);
        if(pp.vAlign == 'center'){
          y -= h/2;
        }else if(pp.vAlign == 'bottom'){
          y -= h;
        }else if(ns){
          y -= ns * h;
        }
        ctx.drawImage(pp.img, x, y, w, h);
      }
    }
  }

  function draw(){
    resize();
    const ctx = config.ctx;
    ctx.clearRect(0, 0, config.width, config.height);
    ctx.fillStyle = config.style.background;
    ctx.fillRect(0, 0, config.width, config.height);

    if(config.mouseTrace && mouseTracePoints.length > 0){
      const colors = adaptiveColorSteps(config.style.background, mouseTracePoints.length);
      let i = 0;
      for(let region of mouseTracePoints){
        ctx.fillStyle = colors[i++];
        ctx.beginPath();
        ctx.moveTo(region[0][0], region[0][1]);
        ctx.lineTo(region[1][0], region[1][1]);
        ctx.lineTo(region[2][0], region[2][1]);
        ctx.lineTo(region[3][0], region[3][1]);
        ctx.lineTo(region[0][0], region[0][1]);
        ctx.fill();
      }
    }

    if(config.grid === true){
      drawGrid();
    }

    // 画路径
    renderPath();

    // 画点
    renderImage();

    if(config.unitVector){
      ctx.fillStyle = config.style.color;
      ctx.font = "18px Arial";
      ctx.textAlign = "left";
      ctx.textBaseline = 'middle';
      ctx.fillText(`x = (${config.xv[0]},${config.xv[1]})`, 20, config.height - 40);
      ctx.fillText(`y = (${config.yv[0]},${config.yv[1]})`, 20, config.height - 15);
    }
    if(config.axesHelper === true){
      drawAxesHelper();
    }
    
    if(config.debug && config.debugPoint){
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(
          config.debugPoint[0], 
          config.debugPoint[1], 
          10, 
          0, 
          Math.PI * 2
      );
      ctx.fill();
    }
  }

  function render(){
    requestAnimationFrame(draw);
  }

  const xHelperOffset = 200;
  const yHelperOffset = 150;

  /**
   * 转为轴像素坐标
   * @param {*} x 
   * @param {*} y 
   */
  function toAxesHelperViewCoordinate(coor){
    const xOffset = config.width - xHelperOffset;
    const yOffset = config.height - yHelperOffset;
    const scale = config.gapScale;
    return [
      coor[0] * scale + xOffset,
      coor[1] * scale + yOffset
    ];
  }

  function fromAxesHelperViewCoordinate(coor){
    const xOffset = config.width - xHelperOffset;
    const yOffset = config.height - yHelperOffset;
    const scale = config.gapScale;
    return [
      (coor[0] - xOffset)/scale,
      (coor[1] - yOffset)/scale
    ];
  }
  /**
   * 绘制辅助轴
   */
  function drawAxesHelper(){
    const yOffset = config.height - yHelperOffset;
    const xOffset = config.width - xHelperOffset;
    const scale = config.gapScale;
    const ctx = config.ctx;

    const xx = config.xv[0] * scale + xOffset;
    const xy = config.xv[1] * scale + yOffset;
    const yx = config.yv[0] * scale + xOffset;
    const yy = config.yv[1] * scale + yOffset;

    ctx.lineWidth = 2;
    ctx.strokeStyle = config.style.color;
    ctx.beginPath();
    ctx.moveTo(xOffset, yOffset);
    ctx.lineTo(xx, xy);
    ctx.moveTo(xOffset, yOffset);
    ctx.lineTo(yx, yy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(xOffset, yOffset, 4, 0, Math.PI * 2, false);
    ctx.fillStyle = config.style.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(xx, xy, 12, 0, Math.PI * 2, false);
    ctx.fillStyle = '#4CAF50';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(yx, yy, 12, 0, Math.PI * 2, false);
    ctx.fillStyle = '#F44336';
    ctx.fill();

    ctx.fillStyle = config.style.color;
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = 'middle';
    ctx.fillText('x', xx, xy);
    ctx.fillText('y', yx, yy);
  }

  /**
   * 绘制背景网格
   */
  function drawGrid(){
    const ctx = config.ctx;

    if(config.gridLineType == 'dot'){
      ctx.setLineDash([5, 3]);
    }

    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = config.style.grid;

    /*
     垂向量计算:
     原向量为(x1, y1), 则垂向量有两个, 分别为: (-y1, x1) (y1, -x1)
     */
    const v1 = config.xv;
    const vv1 = [-v1[1], v1[0]]; // v1的其中一个垂向量
    const v2 = config.yv;
    const vv2 = [-v2[1], v2[0]]; // v2的其中一个垂向量

    ctx.beginPath();
    ctx.strokeStyle = config.style.grid;
    ctx.setLineDash([5, 3]);

    // 视窗四个顶点的矩形坐标
    const rect = [
      [0 - config.xOffset,            0 - config.yOffset],
      [0 - config.xOffset,            config.height - config.yOffset],
      [config.width - config.xOffset, 0 - config.yOffset],
      [config.width - config.xOffset, config.height - config.yOffset]
    ];

    // 绘制横向网格
    const ygap = config.yGridGap;
    let l1 = projectScalar(rect[0][0], rect[0][1], vv1[0], vv1[1]);
    let l2 = projectScalar(rect[1][0], rect[1][1], vv1[0], vv1[1]);
    let l3 = projectScalar(rect[2][0], rect[2][1], vv1[0], vv1[1]);
    let l4 = projectScalar(rect[3][0], rect[3][1], vv1[0], vv1[1]);
    let startLen = roundAwayFromZero(Math.min(l1, l2, l3, l4) / ygap) * ygap;
    let endLen = roundAwayFromZero(Math.max(l1, l2, l3, l4) / ygap) * ygap;
    while(startLen <= endLen){
      let p = scalarToVector(startLen, vv1[0], vv1[1]);
      let coor = viewWindowIntersectCoorinate(v1, p, 0 - config.xOffset, 0 - config.yOffset, 
        config.width - config.xOffset, config.height - config.yOffset);
      if(coor){
        // 逻辑坐标转像素坐标后绘制
        ctx.moveTo(coor[0][0] + config.xOffset, coor[0][1] + config.yOffset);
        ctx.lineTo(coor[1][0] + config.xOffset, coor[1][1] + config.yOffset);
      }
      startLen += ygap;
    }

    // 绘制纵向网格
    const xgap = config.xGridGap;
    l1 = projectScalar(rect[0][0], rect[0][1], vv2[0], vv2[1]);
    l2 = projectScalar(rect[1][0], rect[1][1], vv2[0], vv2[1]);
    l3 = projectScalar(rect[2][0], rect[2][1], vv2[0], vv2[1]);
    l4 = projectScalar(rect[3][0], rect[3][1], vv2[0], vv2[1]);
    startLen = roundAwayFromZero(Math.min(l1, l2, l3, l4) / xgap) * xgap;
    endLen = roundAwayFromZero(Math.max(l1, l2, l3, l4) / xgap) * xgap;
    while(startLen <= endLen){
      let p = scalarToVector(startLen, vv2[0], vv2[1]);
      let coor = viewWindowIntersectCoorinate(v2, p, 0 - config.xOffset, 0 - config.yOffset, 
        config.width - config.xOffset, config.height - config.yOffset);
      if(coor){
        // 逻辑坐标转像素坐标后绘制
        ctx.moveTo(coor[0][0] + config.xOffset, coor[0][1] + config.yOffset);
        ctx.lineTo(coor[1][0] + config.xOffset, coor[1][1] + config.yOffset);
      }
      startLen += xgap;
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 将hex颜色转为rgb
  function hexToRgb(hex) {
    // 如果输入的是 #ffffff 形式
    hex = hex.replace(/^#/, '');
    // 转换为 RGB 数组
    let bigint = parseInt(hex, 16);
    let r = (bigint >> 16) & 255;
    let g = (bigint >> 8) & 255;
    let b = bigint & 255;

    return [r, g, b];
  }

  // 将rgb颜色转为hex
  function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }

  // 创建阶梯颜色数组
  function adaptiveColorSteps(hex, steps = 5, maxDelta = 40) {
    const [r, g, b] = hexToRgb(hex);

    // 计算亮度
    const luminance = getLuminance(r, g, b);

    // 决定方向：亮色 → 变暗（负因子），暗色 → 变亮（正因子）
    const isLight = luminance > 0.5;
    const stepDelta = isLight ? -Math.floor(maxDelta / steps) : Math.floor(maxDelta / steps);

    const result = [];
    for (let i = 0; i <= steps; i++) {
      let nr = clamp(r + stepDelta * i, 0, 255);
      let ng = clamp(g + stepDelta * i, 0, 255);
      let nb = clamp(b + stepDelta * i, 0, 255);
      result.push(rgbToHex(nr, ng, nb));
    }

    return result;
  }

  // 根据 WCAG 标准，RGB 颜色的相对亮度计算公式
  function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }

  /**
   * 向远离0的方向取整
   * @param {x} 待取整的值
   * @returns 
   */
  function roundAwayFromZero(x) {
    return x >= 0 ? Math.ceil(x) : Math.floor(x);
  }

  /**
   * 计算点到原点沿向量 (ux, uy) 方向的投影标量值
   * @param {number} x - 点的 x 坐标
   * @param {number} y - 点的 y 坐标
   * @param {number} ux - 向量的 x 分量
   * @param {number} uy - 向量的 y 分量
   * @returns {number} 投影标量值
   */
  function projectScalar(x, y, ux, uy) {
      return (x * ux + y * uy) / Math.hypot(ux, uy);
  }

  /**
   * 将标量投影转换为二维平面上的点
   * @param {number} scalar - 投影标量值
   * @param {number} ux - 向量的 x 分量
   * @param {number} uy - 向量的 y 分量
   * @returns {{x: number, y: number}} 投影点的坐标
   */
  function scalarToVector(scalar, ux, uy) {
      const length = Math.hypot(ux, uy);
      return [scalar * (ux / length), scalar * (uy / length)];
  }

  /**
   * 与视图窗口边缘相交的坐标(两点)
   * @param {*} v 向量
   * @param {*} point 直线经过的点(相当于把向量偏移到经过这个点的位置)
   * @param {*} minX 视窗范围x最小值
   * @param {*} minY 视窗范围y最小值
   * @param {*} maxX 视窗范围x最大值
   * @param {*} maxY 视窗范围y最大值
   * @returns 
   */
  function viewWindowIntersectCoorinate(v, point/*该线一定经过的点*/, minX, minY, maxX, maxY){
    const points = [];
    if(v[0] === 0){ // 防止斜率无穷大
      points.push([point[0], minY], [point[0], maxY]);
    }else{
      const k = v[1] / v[0];
      const b = point[1] - k * point[0];
      
      points.push(
        [minX, k*minX + b], // 与垂直左边缘交点
        [maxX, k*maxX + b], // 与垂直右边缘交点
        [(minY - b)/k, minY], // 与水平下边缘交点
        [(maxY - b)/k, maxY] // 与水平上边缘交点
      );
    }

    const ppset = [];
    const realPoints = [];
    for(let pp of points){
      const key = `${pp[0]},${pp[1]}`;
      if(!ppset.includes(key) && pp[0] >= minX && pp[0] <= maxX && pp[1] >= minY && pp[1] <= maxY){
        realPoints.push(pp);
        ppset.push(key);
      }
    }

    if(realPoints.length > 1){
      return [realPoints[0], realPoints[1]];
    }
    return null;
  }

  /**
   * 获取一个向量的单位向量
   */
  function vectorNormalize(v){
    let m = Math.hypot(v[0], v[1]);
    return [v[0] / m, v[1] / m];
  }

  /**
   * 求矩阵的逆矩阵
   * @param {} matirx 
   */
  function inverseMatrix(matrix){
    const [[a, b], [c, d]] = matrix;
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-12){ return null; }

    const invDet = 1 / det;
    return [
      [ d * invDet, -b * invDet],
      [-c * invDet,  a * invDet]
    ];
  }

  /**
   * 坐标变换
   */
  function coordinateTransform(x, y){
    return [
      (config.xv[0] * x + config.yv[0] * y) * config.scale + config.xOffset,
      (config.xv[1] * x + config.yv[1] * y) * config.scale + config.yOffset
    ];
  }

  /**
   * 坐标变换
   */
  function inverseCoordinateTransform(x, y){
    x -= config.xOffset;
    y -= config.yOffset;
    x = x / config.scale;
    y = y / config.scale;
    const xv = config.inverseMatrix[0];
    const yv = config.inverseMatrix[1];
    return [
      (xv[0] * x + yv[0] * y),
      (xv[1] * x + yv[1] * y)
    ];
  }

  init();

  /**
   * 添加路径
   * 结构示例: [[0, 0], [1, 1], [2, 2]]
   * @param {*} path 
   */
  frogObj.drawPath = function(path, options){
    if(!options){ options = {strokeStyle: '#121212'}; }
    pathList.push({
      data: [...path],
      ...options
    });
    render();
  }

  const imgCache = new Map();
  /**
   * 
   * @param {*} coor 图片坐标 
   * @param {*} img 图片路径
   * @param {*} hAlign 水平对齐: left, center, right
   * @param {*} vAlign 垂直对齐: top, center, bottom
   * @param {*} scale 图片缩放
   */
  function addPointImage(coor, img, hAlign = 'left', vAlign = 'top', scale = 1){
    let m = imgCache.get(img);
    const x = coor[0];
    const y = coor[1];
    if(m){
      points.push({
        x, y, img:m, imgScale: scale, hAlign: hAlign, vAlign: vAlign, imgReady: true
      });
      render();
    }else{
      m = new Image();
      m.src = img;
      const imgPoint = {x, y, img: m, imgScale: scale, hAlign: hAlign, vAlign: vAlign, imgReady: false};
      points.push(imgPoint);
      m.onload = () => {
        imgCache.set(img, m);
        imgPoint.imgReady = true;
        render();
      }
    }
  }

  function clear(){
    points.length = 0;
    pathList.length = 0;
  }

  frogObj.drawImage = addPointImage;
  frogObj.clear = function(){
    clear();
    config.xOffset = 0;
    config.yOffset = 0;
    render();
  }

  frogObj.refreshScene = function(options){
    config.xOffset = 0;
    config.yOffset = 0;
    Object.assign(config, options);
    clear();
    initCoorSystem();
    render();
  }

  function adaptPosition(){
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for(let p of points){
      sumX += p.x;
      sumY += p.y;
      count++;
    }
    for(let p of pathList){
      for(let pp of p.data){
        sumX += pp[0];
        sumY += pp[1];
        count++;
      }
    }
    if(count == 0){ return; }
    const viewCenterX = config.width / 2;
    const viewCenterY = config.height / 2;
    const targetCenterX = sumX / count;
    const targetCenterY = sumY / count;
    
    const realX = config.xv[0] * targetCenterX + config.yv[0] * targetCenterY;
    const realY = config.xv[1] * targetCenterX + config.yv[1] * targetCenterY;

    config.xOffset = viewCenterX - realX;
    config.yOffset = viewCenterY - realY;
    render();
  }

  // 位置自适应, 使得整个图像的重心居中
  frogObj.positionAdapt = adaptPosition;

  frogObj.hiddenGrid = function(){
    config.grid = false;
    render();
  }
  frogObj.showGrid = function(){
    config.grid = true;
    render();
  }
  frogObj.showAxis = function(){
    config.axesHelper = true;
    render();
  }
  frogObj.hiddenAxis = function(){
    config.axesHelper = false;
    render();
  }
  frogObj.showUnitVector = function(){
    config.unitVector = true;
    render();
  }
  frogObj.hiddenUnitVector = function(){
    config.unitVector = false;
    render();
  }
  frogObj.showMouseTrace = function(){
    config.mouseTrace = true;
    render();
  }
  frogObj.hiddenMouseTrace = function(){
    config.mouseTrace = false;
    mouseTracePoints.length = 0;
    render();
  }

  return frogObj;
}