/**
 * 经典的 Perlin Noise 实现 (简化版)
 * 用于生成平滑的随机数
 */
class PerlinNoise {
    constructor() {
        this.p = new Uint8Array(512);
        this.permutation = new Uint8Array(256);
        this.init();
    }

    init() {
        for (let i = 0; i < 256; i++) this.permutation[i] = i;
        // 洗牌
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.permutation[i], this.permutation[j]] = [this.permutation[j], this.permutation[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = this.permutation[i % 256];
    }

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise(x, y, z) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        const u = this.fade(x), v = this.fade(y), w = this.fade(z);
        const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA], x, y, z), this.grad(this.p[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.p[AB], x, y - 1, z), this.grad(this.p[BB], x - 1, y - 1, z))
            ),
            this.lerp(v,
                this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1), this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1), this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))
            )
        );
    }
}


const dirt = 'block/dirt.png';
const grass_block = 'block/grass_block.png';
const water = 'block/water.png';
const tree0 = 'block/tree0.png';
const tree1 = 'block/tree1.png';
const tree2 = 'block/tree2.png';
const tree3 = 'block/tree3.png';
const tree4 = 'block/tree4.png';
const tree5 = 'block/tree5.png';
const tree6 = 'block/tree6.png';

function blockScene(config){
    const options = {
        scale: 10,  // 地形平滑度, 越大越平滑
        persistence: 0.5, // 幅度衰减, 取值: [0, 1] (越大 (接近 1.0)：地形越崎岖、尖锐、混乱，细节非常突出，甚至盖过主轮廓)  (越小 (接近 0.0)：地形越柔和、平滑，细节被淹没，主要看大轮廓)
        octaves: 4, // 细节层数, 越小越平滑、模糊; 越大越嘈杂、细碎;
        heightMultiplier: 50,  // 最大高度约为 50
        // 基准偏移量 (Base Offset)
        // 范围通常是 0.0 到 1.0 (针对归一化后的 0-1 噪声)
        // 0.0 = 正常地形 (50%水/地)
        // 0.4 = 大部分是低地，少量高地
        // 0.6 = 非常薄的陆地，像群岛
        // 0.8 = 几乎全是深海/虚空，只有极个别尖峰
        baseOffset: -0.2,  // 尝试 0.0 (对称), 0.2 (偏负), -0.2 (偏正)
        ...config
    };

    function generateTerrainWithNegative(width, depth, scale, octaves, persistence, heightMultiplier, baseOffset) {
        const perlin = new PerlinNoise();
        perlin.init();
        const terrainPoints = [];
        
        // 调试计数器
        let minRaw = Infinity, maxRaw = -Infinity;
        let negativeCount = 0;

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < depth; y++) {
                let noiseValue = 0;
                let amplitude = 1;
                let frequency = 1;
                // 注意：这里我们不再累加 maxValue 用于除法归一化，而是采用加权求和后直接处理
                // 因为标准的 Perlin 噪声每一层输出都在 [-1, 1] 之间
                // 叠加后的理论范围是 [-sum(amplitudes), sum(amplitudes)]
                
                let totalAmplitude = 0;

                for (let i = 0; i < octaves; i++) {
                    const sampleX = x / scale * frequency;
                    const sampleY = y / scale * frequency;
                    
                    const value = perlin.noise(sampleX, sampleY, 0); // 范围 [-1, 1]
                    
                    noiseValue += value * amplitude;
                    totalAmplitude += amplitude;

                    amplitude *= persistence;
                    frequency *= 2;
                }

                // 【关键修正】：显式归一化到 [-1, 1]
                // 必须除以总振幅，否则数值会超出 [-1, 1]
                let normalizedHeight = noiseValue / totalAmplitude;

                // 调试用：记录原始分布
                if (normalizedHeight < minRaw) minRaw = normalizedHeight;
                if (normalizedHeight > maxRaw) maxRaw = normalizedHeight;
                if (normalizedHeight < 0) negativeCount++;

                // 应用偏移量
                // 假设 normalizedHeight 是 [-1, 1]
                // 减去 baseOffset (例如 0.2) -> 范围变为 [-1.2, 0.8]
                normalizedHeight -= baseOffset;

                // 【重要】：绝对不要在这里做 Math.max(0, ...) 或者 if < 0 then 0
                
                // 计算最终高度
                const z = Math.round(normalizedHeight * heightMultiplier);

                terrainPoints.push({ x, y, z });
            }
        }
        
        return terrainPoints;
    }

    /**
     * 地形生成器
     * @param {number} cols - 地形宽度 (X轴范围)
     * @param {number} rows - 地形深度 (Y轴范围)
     * @param {number} scale - 噪声缩放比例 (越小越平缓，越大越崎岖)
     * @param {number} octaves - 倍频层数 (细节丰富度)
     * @param {number} persistence - 持久性 (每层幅度的衰减率)
     * @param {number} heightMultiplier - 高度倍增系数 (控制山的最高度)
     */
    function generateTerrain(cols, rows, scale, octaves, persistence, heightMultiplier) {
        const perlin = new PerlinNoise();
        const terrainPoints = [];


            const baseOffset = 0.3; 

            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    let noiseValue = 0;
                    let amplitude = 1;
                    let frequency = 1;
                    let maxValue = 0;

                    // 1. 叠加多层噪声 (Octaves)
                    for (let i = 0; i < octaves; i++) {
                        const sampleX = x / scale * frequency;
                        const sampleY = y / scale * frequency;
                        
                        // 获取原始噪声 (-1 到 1)
                        const value = perlin.noise(sampleX, sampleY, 0);
                        
                        noiseValue += value * amplitude;
                        maxValue += amplitude;

                        amplitude *= persistence;
                        frequency *= 2;
                    }

                    // 2. 归一化到 0 - 1 范围
                    // 公式: (value / max + 1) / 2
                    let normalizedHeight = (noiseValue / maxValue + 1) / 2;

                    // 3. 【核心修改 A】应用基准偏移量
                    // 减去 offset，让大部分值变成负数
                    normalizedHeight -= baseOffset;

                    // 4. 【核心修改 B】(可选) 应用非线性曲线，让高地更陡峭
                    // 如果 normalizedHeight > 0，则进行平方运算，进一步压低低处，拉高高处
                    if (normalizedHeight > 0) {
                        // 指数越大，地面越薄，山峰越陡
                        const exponent = 1.5; 
                        normalizedHeight = Math.pow(normalizedHeight, exponent);
                    }

                    // 5. 处理负数：如果小于 0，强制设为 0 (形成平坦的底部/海平面)
                    // if (normalizedHeight < 0) {
                    //     normalizedHeight = 0;
                    // }

                    console.log(normalizedHeight);
                    // 6. 计算最终高度并取整
                    const z = Math.round(normalizedHeight * heightMultiplier);

                    terrainPoints.push({ x, y, z });
                }
            }

            return terrainPoints;
    }

    function insertTree(x, y, z, points){
        // 树干
        points.push({ img: tree6, x: x, y: y, z: z + 1 });
        // 树心
        points.push({ img: tree0, x: x, y: y, z: z + 2 });
        // 树叶上
        points.push({ img: tree4, x: x, y: y - 1, z: z + 2 });
        // 树顶
        points.push({ img: tree5, x: x, y: y, z: z + 3 });
        // 树叶右
        points.push({ img: tree1, x: x + 1, y: y, z: z + 2 });
         // 树叶左
        points.push({ img: tree2, x: x - 1, y: y, z: z + 2});
        // 树叶下
        points.push({ img: tree3, x: x, y: y + 1, z: z + 2 });
    }

    const obj = {};
    obj.randomTerrain = function(cols, rows){
        //(width, depth, scale, octaves, persistence, heightMultiplier, baseOffset)
        const terrainData = generateTerrainWithNegative(cols, rows, options.scale, options.octaves, options.persistence, options.heightMultiplier, options.baseOffset);
        // const terrainData = generateTerrain(cols, rows, options.scale, options.octaves, options.persistence, options.heightMultiplier);
        let maxZ = 0;
        for(let p of terrainData){
            maxZ = Math.max(p.z, maxZ);
        }
        const points = [];
        for(let p of terrainData){
            if(p.z < 0){  // 水池
                const obj = {
                    img: water,
                    ...p
                };
                obj.z = 0;
                points.push(obj);
            }else{
                // 土壤
                for(let i = 0; i < p.z; i++){
                    let obj = {
                        img: dirt,
                        ...p
                    };
                    obj.z = i;
                    points.push(obj);
                }

                if(p.z >= maxZ - 1 && Math.random() > 0.8){ // 栽树
                    insertTree(p.x, p.y, p.z, points);
                }
                // 草块
                points.push({
                    img: grass_block,
                    ...p
                });
            }
        }
        return points;
    }
    return obj;
}