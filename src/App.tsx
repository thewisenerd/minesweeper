import './App.css'
import * as React from "react";
import {createContext, useContext, useState} from "react";

// todo: bugs
// - x/y inconsistency causing issues with non-uniform width/height

// '⬜️'
// '💣'
// '☑️'
// '🟧'
// '🟥'
// '🚩'

const numberEmoji = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
]

type ProgressionType = 'WAIT' | 'SUCCESS' | 'FAIL'

interface GameState {
    progression: ProgressionType;
}

type CellType = 'EMPTY' | 'BOMB' | 'NEIGHBOR'

interface CellUserState {
    key: number;
    open: boolean;
    flag: boolean;
}

interface CellState {
    x: number;
    y: number;
    type: CellType;
    bombNeighborCount?: number;

    userState: CellUserState;
}

const cellHasBomb = (grid: CellState[][], x: number, y: number) => {
    const line = grid[x];
    if (line == undefined) {
        return false;
    }
    const cell = line[y];
    if (cell == undefined) {
        return false;
    }
    return cell.type == 'BOMB'
}

const generateGrid = (width: number, height: number, count: number) => {
    const grid: CellState[][] = [];
    for (let i = 0; i < height; i++) {
        grid[i] = [];
        for (let j = 0; j < width; j++) {
            grid[i][j] = {
                x: i,
                y: j,
                type: 'EMPTY',
                userState: {
                    key: 0,
                    open: false,
                    flag: false,
                }
            }
        }
    }
    const bombs: number[][] = [];
    while (bombs.length < count) {
        const x = Math.floor(Math.random() * (width - 1));
        const y = Math.floor(Math.random() * (height - 1));

        let used = false;
        for (let n = 0; n < bombs.length; n++) {
            if (bombs[n][0] == x && bombs[n][1] == y) {
                used = true;
                break;
            }
        }
        if (used) {
            continue;
        }

        bombs.push([x, y])
    }

    for (let n = 0; n < bombs.length; n++) {
        const [x, y] = bombs[n];
        grid[x][y].type = 'BOMB';
    }

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (grid[i][j].type == 'BOMB') {
                continue;
            }
            if (grid[i][j].type == 'NEIGHBOR') {
                throw new Error('we have not marked any neighbors yet?')
            }

            let neighborCount = 0;

            if (cellHasBomb(grid, i - 1, j - 1)) neighborCount++;
            if (cellHasBomb(grid, i - 1, j)) neighborCount++;
            if (cellHasBomb(grid, i - 1, j + 1)) neighborCount++;

            if (cellHasBomb(grid, i, j - 1)) neighborCount++;
            if (cellHasBomb(grid, i, j + 1)) neighborCount++;

            if (cellHasBomb(grid, i + 1, j - 1)) neighborCount++;
            if (cellHasBomb(grid, i + 1, j)) neighborCount++;
            if (cellHasBomb(grid, i + 1, j + 1)) neighborCount++;

            if (neighborCount > 0) {
                grid[i][j].type = 'NEIGHBOR';
                grid[i][j].bombNeighborCount = neighborCount;
            }
        }
    }

    return grid;
}

const printGridChar = (state: CellState) => {
    if (state.type == 'EMPTY') {
        return '⬜️'
    }
    if (state.type == 'BOMB') {
        return '💣'
    }
    if (state.type == 'NEIGHBOR') {
        return numberEmoji[state.bombNeighborCount! - 1];
    }
    throw new Error('should not get here.')
}

const printGrid = (grid: CellState[][]) => {
    const charMap = grid.map(line => {
        return line.map(cell => printGridChar(cell)).join('');
    }).join('\n');
    console.log(charMap);
}

const gridWidth = 10;
const gridHeight = 10;
const bombCount = 10;
const grid = generateGrid(gridWidth, gridHeight, bombCount);
printGrid(grid);
const gameState: GameState = {
    progression: 'WAIT'
}

class Engine {
    static open(x: number, y: number) {
        const line = grid[x];
        if (line == undefined) {
            return false;
        }
        const cell = line[y];
        if (cell == undefined) {
            return false;
        }
        if (cell.type == 'BOMB') {
            return false;
        }
        if (cell.userState.open) {
            return false;
        }
        cell.userState.open = true;
        return cell.type == 'EMPTY' && !cell.userState.flag;
    }

    static fan(x: number, y: number) {
        if (this.open(x - 1, y - 1)) this.fan(x - 1, y - 1);
        if (this.open(x - 1, y + 0)) this.fan(x - 1, y);
        if (this.open(x - 1, y + 1)) this.fan(x - 1, y + 1);

        if (this.open(x, y - 1)) this.fan(x, y - 1);
        this.open(x, y);
        if (this.open(x, y + 1)) this.fan(x, y + 1);

        if (this.open(x + 1, y - 1)) this.fan(x + 1, y - 1);
        if (this.open(x + 1, y + 0)) this.fan(x + 1, y);
        if (this.open(x + 1, y + 1)) this.fan(x + 1, y + 1);
    }

    static click(x: number, y: number, aux: boolean, nextFrame: () => void) {
        if (aux) {
            grid[x][y].userState.flag = !grid[x][y].userState.flag;
        } else {
            this.fan(x, y);
            if (grid[x][y].type == 'BOMB') {
                gameState.progression = 'FAIL';
            }
        }

        if (gameState.progression == 'WAIT') {
            let openCount = 0;
            for (let i = 0; i < gridHeight; i++) {
                for (let j = 0; j < gridWidth; j++) {
                    const cell = grid[i][j];
                    if (cell.userState.open) {
                        openCount += 1;
                    }
                }
            }
            const expectedOpenCount = (gridWidth * gridHeight) - bombCount;
            if (openCount == expectedOpenCount) {
                gameState.progression = 'SUCCESS';
            }
        }

        nextFrame();
    }
}

const cssMerge = (styles: (string | undefined)[]) => {
    let result = '';
    for (const s of styles) {
        if (s != undefined) {
            result += ` ${s}`
        }
    }
    return result
}

const userCellText = (state: CellState) => {
    if (state.userState.flag) {
        return '🚩';
    }

    if (state.userState.open) {
        if (state.type == 'BOMB') {
            return '💣';
        }
        if (state.type == 'NEIGHBOR') {
            return `${state.bombNeighborCount}`;
        }
    }

    return ' ';
}

const GridCell: React.FunctionComponent<{
    cell: CellState,
}> = (props) => {
    const {cell} = props;
    const {x, y, userState} = cell;
    const {frame, nextFrame} = useContext(GameContext);

    return <>
        <div
            key={`frame-${frame}-${x}-${y}`}
            className={cssMerge([
                'relative',
                'appearance-none',
                'h-6 w-6',
                'border border-gray-600',
                userState.open
                    ? cssMerge([
                        cell.type == 'NEIGHBOR' ? 'bg-gray-400' : '',
                        cell.type == 'EMPTY' ? 'bg-gray-400' : '',
                    ])
                    : '',
            ])}
            onClick={() => Engine.click(cell.x, cell.y, false, nextFrame)}
            onContextMenu={(ev) => {
                ev.preventDefault();
                Engine.click(cell.x, cell.y, true, nextFrame);
            }}
        >
            <span className={'font-mono -z-10'}>
                {userCellText(cell)}
            </span>
        </div>
    </>
}

const GridLine: React.FunctionComponent<{
    lineIdx: number;
    line: CellState[]
}> = (props) => {
    const {line, lineIdx} = props;
    const {frame} = useContext(GameContext);

    return <div className={'flex flex-row gap-1'}>
        {line.map((cell, cellIdx) => <GridCell key={`cell-${frame}-${lineIdx}-${cellIdx}`} cell={cell}/>)}
    </div>
}

const GameState: React.FunctionComponent<{ state: GameState }> = (props) => {
    const {state} = props;
    return <>
        {state.progression}
    </>
}

const GameContext = createContext({
    frame: 0,
    nextFrame: () => {
    },
})

function App() {
    const [frame, setFrame] = useState(0);
    return (
        <>
            <GameContext.Provider value={{
                frame: frame,
                nextFrame: () => {
                    setFrame(frame + 1);
                    printGrid(grid);
                }
            }}>
                <GameState key={frame} state={gameState}/>
                <div className={'flex flex-col gap-1'}>
                    {grid.map((line, lineIdx) => <GridLine
                        key={`line-${frame}-${lineIdx}`}
                        lineIdx={lineIdx}
                        line={line}
                    />)}
                </div>
            </GameContext.Provider>
        </>
    )
}

export default App
