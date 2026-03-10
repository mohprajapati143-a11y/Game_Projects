const boardElement = document.getElementById('chessboard');
const turnText = document.getElementById('current-turn');
const checkWarning = document.getElementById('check-warning');
const whiteCap = document.getElementById('white-captured');
const blackCap = document.getElementById('black-captured');
const pWhite = document.getElementById('player-white');
const pBlack = document.getElementById('player-black');

let board = [];
let turn = 'w';
let selectedSquare = null;
let validMoves = [];
let pendingPromotion = null;

const pieceMap = {
    'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
    'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

function initBoard() {
    board = [
        ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
        ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
        ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
    updateUI();
    renderBoard();
}

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement('div');
            square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
            
            if (board[r][c]) {
                square.textContent = pieceMap[board[r][c]];
                square.style.color = board[r][c].startsWith('w') ? 'white' : 'black';
            }

            if (selectedSquare?.r === r && selectedSquare?.c === c) square.classList.add('selected');
            if (validMoves.some(m => m.r === r && m.c === c)) square.classList.add('valid-dest');

            square.onclick = () => handleSquareClick(r, c);
            boardElement.appendChild(square);
        }
    }
}

function handleSquareClick(r, c) {
    const piece = board[r][c];
    if (piece && piece.startsWith(turn)) {
        selectedSquare = { r, c };
        validMoves = getFilteredMoves(r, c, board);
        renderBoard();
        return;
    }

    const move = validMoves.find(m => m.r === r && m.c === c);
    if (move) {
        executeMove(selectedSquare.r, selectedSquare.c, r, c);
    } else {
        selectedSquare = null;
        validMoves = [];
        renderBoard();
    }
}

function executeMove(fromR, fromC, toR, toC) {
    const piece = board[fromR][fromC];
    const target = board[toR][toC];

    if (target) {
        const icon = document.createElement('span');
        icon.textContent = pieceMap[target];
        (turn === 'w' ? whiteCap : blackCap).appendChild(icon);
    }

    board[toR][toC] = piece;
    board[fromR][fromC] = '';

    if (piece.endsWith('P') && (toR === 0 || toR === 7)) {
        pendingPromotion = { r: toR, c: toC, color: turn };
        document.getElementById('promotion-modal').style.display = 'flex';
        return;
    }
    finishTurn();
}

function finishTurn() {
    turn = turn === 'w' ? 'b' : 'w';
    updateUI();
    
    if (isKingInCheck(turn, board)) {
        checkWarning.style.display = 'block';
        if (isCheckmate(turn)) {
            alert(`GAME OVER: ${turn === 'w' ? 'Black' : 'White'} wins!`);
        }
    } else {
        checkWarning.style.display = 'none';
    }

    selectedSquare = null;
    validMoves = [];
    renderBoard();
}

function updateUI() {
    turnText.textContent = turn === 'w' ? 'White' : 'Black';
    pWhite.classList.toggle('active', turn === 'w');
    pBlack.classList.toggle('active', turn === 'b');
}

// ... include getRawMoves, getFilteredMoves, isKingInCheck, isCheckmate from previous version ...
// (The core logic functions remain the same as the previous response to ensure full rules)

function getRawMoves(r, c, boardArr) {
    const moves = [];
    const piece = boardArr[r][c];
    if (!piece) return [];
    const type = piece[1];
    const color = piece[0];

    const directions = {
        'R': [[0,1],[0,-1],[1,0],[-1,0]],
        'B': [[1,1],[1,-1],[-1,1],[-1,-1]],
        'Q': [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]],
        'N': [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]],
        'K': [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]
    };

    if (type === 'P') {
        const dir = color === 'w' ? -1 : 1;
        if (boardArr[r+dir] && !boardArr[r+dir][c]) {
            moves.push({r: r+dir, c});
            const startRow = color === 'w' ? 6 : 1;
            if (r === startRow && !boardArr[r+2*dir][c]) moves.push({r: r+2*dir, c});
        }
        for (let dc of [-1, 1]) {
            let target = boardArr[r+dir]?.[c+dc];
            if (target && !target.startsWith(color)) moves.push({r: r+dir, c: c+dc});
        }
    } else if (directions[type]) {
        for (let [dr, dc] of directions[type]) {
            let nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = boardArr[nr][nc];
                if (!target) {
                    moves.push({r: nr, c: nc});
                    if (type === 'N' || type === 'K') break;
                } else {
                    if (!target.startsWith(color)) moves.push({r: nr, c: nc});
                    break;
                }
                nr += dr; nc += dc;
            }
        }
    }
    return moves;
}

function getFilteredMoves(r, c, boardArr) {
    const raw = getRawMoves(r, c, boardArr);
    const color = boardArr[r][c][0];
    return raw.filter(m => {
        const tempBoard = boardArr.map(row => [...row]);
        tempBoard[m.r][m.c] = tempBoard[r][c];
        tempBoard[r][c] = '';
        return !isKingInCheck(color, tempBoard);
    });
}

function isKingInCheck(color, boardArr) {
    let kingPos = null;
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(boardArr[r][c] === color + 'K') kingPos = {r, c};
        }
    }
    const opponent = color === 'w' ? 'b' : 'w';
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(boardArr[r][c].startsWith(opponent)) {
                if(getRawMoves(r, c, boardArr).some(m => m.r === kingPos.r && m.c === kingPos.c)) return true;
            }
        }
    }
    return false;
}

function isCheckmate(color) {
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            if(board[r][c].startsWith(color)) {
                if(getFilteredMoves(r, c, board).length > 0) return false;
            }
        }
    }
    return true;
}

function selectPromotion(type) {
    const { r, c, color } = pendingPromotion;
    board[r][c] = color + type;
    document.getElementById('promotion-modal').style.display = 'none';
    pendingPromotion = null;
    finishTurn();
}

document.getElementById('restart-btn').onclick = () => {
    whiteCap.innerHTML = ''; blackCap.innerHTML = '';
    turn = 'w'; initBoard();
};

initBoard();