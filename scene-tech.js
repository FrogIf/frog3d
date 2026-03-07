function techScene() {
    const imgs = ['tech/ball.png', 'tech/board2.png', 'tech/board3.png', 'tech/box.png',
        'tech/box2.png', 'tech/cylinder.png', 'tech/halfcircle.png', 'tech/multrect.png', 'tech/platcy.png', 'tech/wifi.png'];
    const config = {};

    /**
     * 随机数字, 范围: [min, max]
     */
    function randomInt(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 计算点位置
     */
    function calculateNodePosition(topo, dstId) {
        // 确定终点id集合
        let dstIds = new Array();
        let sourceIdToTargetIdList = new Map();
        for (let line of topo.lines) {
            let list = sourceIdToTargetIdList.get(line.source);
            if (!list) {
                list = new Array()
                sourceIdToTargetIdList.set(line.source, list);
            }
            list.push(line.target);
        }

        for (let line of topo.lines) {
            if (!sourceIdToTargetIdList.has(line.target)) {
                if (!dstIds.includes(line.target)) {
                    dstIds.push(line.target);
                }
            }
        }
        if (dstId) {
            dstIds.push(dstId);
        }
        if (dstIds.length == 0) { // 说明有环
            let ddId = null;
            let dstSize = Number.MAX_SAFE_INTEGER;
            for (let entry of sourceIdToTargetIdList.entries()) {
                if (entry[1].length < dstSize) {
                    ddId = entry[0];
                    dstSize = entry[1].length;
                }
            }
            dstIds.push(ddId);
        }

        // 梳理节点层级结构
        let loopThreshold = topo.nodes.length * 1000;
        let tree = new Array();
        tree.push(dstIds)

        let historySet = new Array();
        historySet = historySet.concat(dstIds);

        // 从终点向前
        let loop = loopThreshold;
        for (; loop > 0; loop--) {
            let tmpArr = new Array();
            let first = tree[0];
            for (let dst of first) {
                for (let line of topo.lines) {
                    if (dst == line.target && !historySet.includes(line.source)) {
                        historySet.push(line.source);
                        tmpArr.push(line.source);
                    }
                }
            }
            if (tmpArr.length == 0) { break; }
            tree.unshift(tmpArr);
        }

        if (loop == 0) {
            console.warn("detect dead loop on tree build first step");
        }

        let srcIdSet = new Array();
        srcIdSet = srcIdSet.concat(tree[0]);
        let index = 0;
        loop = loopThreshold;
        // 从前向后
        for (; loop > 0; loop--) {
            let tmpArr = new Array();
            for (let line of topo.lines) {
                if (srcIdSet.includes(line.source) && !historySet.includes(line.target)) {
                    historySet.push(line.target);
                    tmpArr.push(line.target);
                }
            }
            index++;
            if (tmpArr.length == 0) {
                if (index < tree.length) {
                    srcIdSet = new Array().concat(tree[index]);
                } else {
                    break;
                }
            } else {
                let arr = null;
                if (index < tree.length) {
                    arr = tree[index];
                } else {
                    arr = new Array();
                    tree.push(arr);
                }
                for (let t of tmpArr) {
                    arr.push(t);
                }
                tree[index] = arr;
                srcIdSet = new Array().concat(arr);
            }
        }
        if (loop == 0) {
            console.warn("detect dead loop on tree build second step");
        }

        // 生成坐标前准备, 构造节点id映射
        let nodeIdToNode = new Map();
        let nodeList = [];
        for (let node of topo.nodes) {
            let nn = {
                node: node
            };
            nodeList.push(nn);
            nodeIdToNode.set(node.id, nn);
        }

        let align = true; // 是否启用对齐
        let idMap = new Map();
        if (align) {
            for (let line of topo.lines) {
                let tList = idMap.get(line.target);
                if (!tList) {
                    tList = new Array();
                    idMap.set(line.target, tList);
                }
                if (!tList.includes(line.source)) { tList.push(line.source); }

                let sList = idMap.get(line.source);
                if (!sList) {
                    sList = new Array();
                    idMap.set(line.source, sList);
                }
                if (!sList.includes(line.target)) { sList.push(line.target); }
            }
        }

        // 按层次生成坐标
        let pointOpt = config.point ?? {};
        let minGap = pointOpt.minGap ?? 200; //点与点之间的最小间隔
        let x = 0;
        let maxX = Number.MIN_SAFE_INTEGER;
        let maxY = Number.MIN_SAFE_INTEGER;
        for (let i = 0; i < tree.length; i++) {
            let layer = tree[i];
            let y = 0 - layer.length / 2 * minGap;
            let standardY = y;

            // 对齐准备数据
            let c2p = new Map(); // current --> parent
            if (align) {
                let parentLayer = i > 0 ? tree[i - 1] : new Array();
                for (let c of layer) {
                    let ll = idMap.get(c);
                    if (ll) {
                        let list = c2p.get(c);
                        if (!list) {
                            list = new Array();
                            c2p.set(c, list);;
                        }
                        for (let l of ll) {
                            if (parentLayer.includes(l) && !list.includes(l)) {
                                list.push(l);
                            }
                        }
                    }
                }
            }
            let lastY = y;
            if (align && i > 0) {
                let l = tree[i - 1];
                if (l.length > 0) {
                    let n = nodeIdToNode.get(l[0]);
                    if (n && ('y' in n)) {
                        lastY = Math.min(lastY, n.y);
                    }
                }
            }
            lastY = lastY - minGap;

            for (let id of layer) {
                let node = nodeIdToNode.get(id);
                if (node != null) {
                    if (align) {  // 与上一级节点进行对齐
                        let ll = c2p.get(id);
                        if (ll && ll.length > 0) {
                            let minY = Number.MAX_SAFE_INTEGER;
                            let maxY = Number.MIN_SAFE_INTEGER;
                            for (let l of ll) {
                                let n = nodeIdToNode.get(l);
                                if (n && ('y' in n)) {
                                    minY = Math.min(minY, n.y);
                                    maxY = Math.max(maxY, n.y);
                                }
                            }
                            let iy = (minY + maxY) / 2;
                            if (iy <= standardY && iy >= lastY + minGap) {
                                y = iy;
                            }
                        }
                    }

                    node.x = x;
                    node.y = y;
                    maxX = Math.max(x, maxX);
                    maxY = Math.max(y, maxY);
                    lastY = y;
                    y += minGap;
                    standardY += minGap;
                }
            }
            x += minGap;
        }

        // 对没有连线的孤点进行坐标生成
        let tx = maxX + minGap;
        let ty = maxY + minGap;
        for (let node of nodeList) {
            if ('x' in node && 'y' in node) {
                continue;
            }
            node.x = tx;
            node.y = ty;
            tx += minGap;
        }
        return nodeList;
    }

    // 生成节点的连接线坐标
    function nodeLink(topo, nodeList) {
        let idToNode = new Map();
        for (let nn of nodeList) {
            idToNode.set(nn.node.id, nn);
        }

        let lineOpt = config.line ?? {};
        let incr = lineOpt.minGap ?? 30;

        let lineId = 0;
        /*
         * link : {
         *    line: line,
         *    lineId: lineId,
         *    path: [
         *       [1, 2]
         *       [2, 3],
         *       ...
         *    ]
         * }
         */
        let links = new Array();
        let maxY = Number.MIN_SAFE_INTEGER;
        let minY = Number.MAX_SAFE_INTEGER;
        for (let line of topo.lines) {
            let source = idToNode.get(line.source);
            let target = idToNode.get(line.target);
            if (source && target) {
                if (source.x == target.x) { // 竖直线
                    if (source.y == target.y) { // 自指
                        let link = {
                            lineId: lineId,
                            line: line,
                            path: []
                        };
                        links.push(link);
                        link.path.push(
                            [source.x, source.y],
                            [source.x + incr, source.y],
                            [source.x + incr, source.y - incr],
                            [source.x, source.y - incr],
                            [source.x, source.y]
                        );
                        maxY = Math.max(source.y, maxY);
                        minY = Math.min(source.y, minY);
                    } else {
                        let link = {
                            lineId: lineId,
                            line: line,
                            path: []
                        };
                        links.push(link);
                        link.path.push([source.x, source.y], [target.x, target.y]);
                        maxY = Math.max(source.y, target.y, maxY);
                        minY = Math.min(source.y, target.y, minY);
                    }
                } else if (source.x < target.x) { // 向后指的线
                    if (source.y == target.y) { // 水平线
                        let link = {
                            lineId: lineId,
                            line: line,
                            path: []
                        };
                        links.push(link);
                        link.path.push([source.x, source.y], [target.x, target.y]);
                        maxY = Math.max(source.y, maxY);
                        minY = Math.min(source.y, minY);
                    } else { // 向后的折线
                        let width = target.x - source.x;
                        let midX = source.x + width / 2;
                        let link = {
                            lineId: lineId,
                            line: line,
                            path: []
                        };
                        links.push(link);
                        link.path.push([source.x, source.y], [midX, source.y], [midX, target.y], [target.x, target.y]);
                        maxY = Math.max(source.y, target.y, maxY);
                        minY = Math.min(source.y, target.y, minY);
                    }
                } else {
                    // 向前指的线, 先不处理
                }
                lineId++;
            }
        }

        let externalOffsetDown = incr; // 反向线向外偏移的量
        let externalOffsetUp = incr; // 反向线向外偏移的量
        let f = 0;
        for (let line of topo.lines) { // 对反向的线进行处理
            let source = idToNode.get(line.source);
            let target = idToNode.get(line.target);
            if (source && target) {
                if (source.x > target.x) {
                    let yOffsetForSourceUp = source.y - (minY - externalOffsetUp);
                    let yOffsetForTargetUp = target.y - (minY - externalOffsetUp);
                    let upLen = externalOffsetUp + yOffsetForSourceUp + (source.x + externalOffsetUp - target.x + externalOffsetUp) + yOffsetForTargetUp + externalOffsetUp;

                    let yOffsetForSourceDown = maxY + externalOffsetDown - source.y;
                    let yOffsetForTargetDown = maxY + externalOffsetDown - target.y;
                    let downLen = externalOffsetDown + yOffsetForSourceDown + (source.x + externalOffsetDown - target.x + externalOffsetDown) + yOffsetForTargetDown + externalOffsetDown;


                    let link = {
                        lineId: lineId,
                        line: line,
                        path: []
                    };
                    links.push(link);
                    if (downLen > upLen) { // 寻找最短路径
                        link.path.push(
                            [source.x, source.y],
                            [source.x + externalOffsetUp, source.y],
                            [source.x + externalOffsetUp, source.y - yOffsetForSourceUp],
                            [target.x - externalOffsetUp, target.y - yOffsetForTargetUp],
                            [target.x - externalOffsetUp, target.y],
                            [target.x, target.y]
                        );
                        externalOffsetUp += incr;
                    } else {
                        link.path.push(
                            [source.x, source.y],
                            [source.x + externalOffsetDown, source.y],
                            [source.x + externalOffsetDown, source.y + yOffsetForSourceDown],
                            [target.x - externalOffsetDown, target.y + yOffsetForTargetDown],
                            [target.x - externalOffsetDown, target.y],
                            [target.x, target.y]
                        );
                        externalOffsetDown += incr;
                    }
                    f++;
                    lineId++;
                }
            }
        }

        return links;
    }

    function generateScene() {
        // 随机生成点
        const nodes = [];
        const count = randomInt(3, 8);
        for (let i = 0; i < count; i++) {
            let icon = imgs[randomInt(0, imgs.length - 1)];
            nodes.push(
                {
                    id: i,
                    icon: icon
                }
            );
        }

        // 随机连线
        const lines = [];
        const linkArr = new Array(count).fill(0);
        for(let i = 0; i < count; i++){
            if(linkArr[i] > 2){ continue; }
            let t = randomInt(i + 1, count - 1);
            lines.push({
                source: i,
                target: t,
                label: `${i} --> ${t}`
            });
        }

        // 自动布局
        const topo = { lines: lines, nodes: nodes };
        let nodeCollection = calculateNodePosition(topo, null);
        let linkCollection = nodeLink(topo, nodeCollection); // 计算节点连线坐标
        
        const pathList = [];
        const nodeList = [];
        for(let link of linkCollection){
            pathList.push(link.path);
        }
        for(let node of nodeCollection){
            nodeList.push({
                x: node.x,
                y: node.y,
                img: node.node.icon
            });
        }
        return {
            nodes: nodeList,
            lines: pathList
        };
    }


    const techSpace = {};

    techSpace.generateScene = generateScene;

    return techSpace;
}