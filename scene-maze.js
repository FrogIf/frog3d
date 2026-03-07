function mazeScene(){
    const resources = [
        ['maze/cabin1.png', 1], 
        ['maze/cabin2.png', 2],
        ['maze/cabin3.png', 1], 
        ['maze/cabin4.png', 1], 
        ['maze/chair.png', 5],
        ['maze/flower.png', 5],
        ['maze/highlight.png', 3],
        ['maze/light.png', 5],
        ['maze/man.png', 1],
        ['maze/mushroom.png', 5],
        ['maze/stone.png', 5],
        ['maze/tree.png', 1],
        ['maze/tree2.png', 1],
        ['maze/windmill.png', 1],
        ['maze/windtool.png', 2]
    ];

    const imgs = [];
    for(let r of resources){
        for(let i = 0; i < r[1]; i++){
            imgs.push(r[0]);
        }
    }

    function generateMaze(width, height) {
        // 确保宽高为奇数，以便有清晰的墙和通路结构
        if (width % 2 === 0) width++;
        if (height % 2 === 0) height++;

        // 初始化迷宫：全部为墙（0）
        const grid = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => 0)
        );

        /*
            1 - 上
            2 - 下
            3 - 上下
            4 - 左
            5 - 左上
            6 - 左下
            7 - 左上下
            8 - 右
            9 - 右上
            10 - 右下
            11 - 右上下
            12 - 右左
            13 - 右左上
            14 - 右左下
            15 - 右左上下
        */
        // 方向：上下左右（每次移动两格）
        const directions = [
            [0, -2, 0b0001 /*路径朝向: 上*/, 0b0010 /*对立路径朝向: 下*/, 0b0011 /*贯通路径: 上下*/],
            [0, 2, 0b0010, 0b0001, 0b0011],
            [-2, 0, 0b0100, 0b1000, 0b1100],
            [2, 0, 0b1000, 0b0100, 0b1100]
        ];

        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function dfs(x, y) {
            // 随机打乱方向顺序，使迷宫更随机
            const shuffledDirs = shuffle([...directions]);

            for (const [dx, dy, val, opp, t] of shuffledDirs) {
                const nx = x + dx;
                const ny = y + dy;

                // 检查新位置是否在边界内，并且尚未访问（仍为墙）
                if (
                    nx > 0 &&
                    nx < width - 1 &&
                    ny > 0 &&
                    ny < height - 1 &&
                    grid[ny][nx] === 0
                ) {
                    grid[y][x] |= val;
                    // 打通中间的墙
                    grid[y + dy / 2][x + dx / 2] = t;
                    grid[ny][nx] |= opp;
                    // 递归
                    dfs(nx, ny);
                }
            }
        }

        // 从 (1, 1) 开始生成迷宫
        dfs(1, 1);

        // 可选：设置入口和出口
        grid[0][1] = 0; // 入口
        grid[height - 1][width - 2] = 0; // 出口

        return grid;
    }

    /**
     * 随机数字, 范围: [min, max]
     */
    function randomInt(min, max){
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const obj = {};

    obj.generateMaze = (rows, cols) => {
        const points = [];
        const maze = generateMaze(rows, cols);
        for(let i = 0; i < rows; i++){
            for(let j = 0; j < cols; j++){
                let mark = maze[i][j];
                let img = mark == 0 ? imgs[randomInt(0, imgs.length - 1)] : `maze/r${mark}.png`;
                // if(i == 0 || j == 0){
                //     img = i % 2 == 0 ? 'maze/tree.png' : 'maze/tree2.png';
                // }else if(i == rows - 1 || j == cols - 1){
                //     img = 'maze/tree2.png';
                // }else{
                //     img = mark == 0 ? imgs[randomInt(0, imgs.length - 1)] : `maze/r${mark}.png`;
                // }
                points.push({
                    x: j,
                    y: i,
                    img: img
                });
            }
        }
        return points;
    };

    return obj;
}