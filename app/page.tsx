'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Clock3, Gamepad2, Info, RotateCcw, Trophy, X } from 'lucide-react'

type Mark = '' | 'X' | 'O'
type MatchType = '1v1' | 'bot'
type ModeName = 'Classic' | 'Ultimate' | 'Gravity' | 'Hexagon' | 'Lights Out' | 'Blitz' | 'Wild West' | 'Mirror' | 'Mosaic' | 'Memory' | 'Chaos' | 'Zen'
type Mode = { name: ModeName; detail: string; icon: string; color: string }

const modes: Mode[] = [
  { name: 'Classic', detail: '3 × 3 · first to 3', icon: '×', color: 'coral' },
  { name: 'Ultimate', detail: '9 boards · strategy', icon: '▦', color: 'blue' },
  { name: 'Gravity', detail: 'Drop your mark', icon: '↓', color: 'gold' },
  { name: 'Hexagon', detail: 'Connect 4 · 5 × 5', icon: '⬡', color: 'violet' },
  { name: 'Lights Out', detail: 'Fewest flips wins', icon: '✦', color: 'teal' },
  { name: 'Blitz', detail: '30 seconds each', icon: 'ϟ', color: 'coral' },
  { name: 'Wild West', detail: 'Draw & duel', icon: '✺', color: 'gold' },
  { name: 'Mirror', detail: 'Copy the board', icon: '◈', color: 'blue' },
  { name: 'Mosaic', detail: 'Most territory wins', icon: '▤', color: 'violet' },
  { name: 'Memory', detail: 'Remember marks', icon: '⌁', color: 'teal' },
  { name: 'Chaos', detail: 'Rules change', icon: '?', color: 'coral' },
  { name: 'Zen', detail: 'No score · no rush', icon: '○', color: 'gold' },
]

const classicLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
const emptyBoard = (size = 9): Mark[] => Array(size).fill('')
const winner = (board: Mark[], lines = classicLines) => lines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c])
const eloDelta = (rating: number, opponent: number, result: number) => Math.round(32 * (result - 1 / (1 + 10 ** ((opponent - rating) / 400))))

function chooseBotMove(board: Mark[], mark: Mark, lines: number[][]) {
  const open = board.map((v, i) => v ? -1 : i).filter(i => i >= 0)
  for (const i of open) { const next = [...board]; next[i] = mark; if (winner(next, lines)) return i }
  const other = mark === 'X' ? 'O' : 'X'
  for (const i of open) { const next = [...board]; next[i] = other; if (winner(next, lines)) return i }
  if (board[4] === '') return 4
  return open[Math.floor(Math.random() * open.length)]
}

// Ultimate mode: 9 mini-boards of 9 cells each (81 total). Cell i belongs to mini-board Math.floor(i / 9).
const cellCountFor = (name: ModeName) => name === 'Hexagon' ? 25 : name === 'Ultimate' ? 81 : 9
function ultimateClaims(board: Mark[]): Mark[] {
  return Array.from({ length: 9 }, (_, b) => {
    const mini = board.slice(b * 9, b * 9 + 9)
    const line = winner(mini, classicLines)
    return line ? mini[line[0]] : ''
  })
}
function chooseUltimateBotMove(board: Mark[], claims: Mark[]) {
  const open = board.map((v, i) => (v || claims[Math.floor(i / 9)]) ? -1 : i).filter(i => i >= 0)
  const tryWin = (mark: Mark) => open.find(i => {
    const b = Math.floor(i / 9); const mini = board.slice(b * 9, b * 9 + 9); mini[i - b * 9] = mark
    return winner(mini, classicLines)
  })
  return tryWin('O') ?? tryWin('X') ?? open[Math.floor(Math.random() * open.length)]
}

export default function Page() {
  const [selected, setSelected] = useState(0)
  const [matchType, setMatchType] = useState<MatchType>('bot')
  const [board, setBoard] = useState<Mark[]>(emptyBoard())
  const [turn, setTurn] = useState<'X'|'O'>('X')
  const [winning, setWinning] = useState<number[]>([])
  const [message, setMessage] = useState('Your move')
  const [rating, setRating] = useState(1200)
  const [delta, setDelta] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(30)
  const [moves, setMoves] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const [hidden, setHidden] = useState(false)
  const mode = modes[selected]
  const opponentRating = 1184
  const isLightsOut = mode.name === 'Lights Out'
  const isUltimate = mode.name === 'Ultimate'
  const size = mode.name === 'Hexagon' ? 5 : 3
  const lines = useMemo(() => size === 5 ? [...Array.from({length: 5}, (_, r) => [r*5,r*5+1,r*5+2,r*5+3]), ...Array.from({length: 5}, (_, c) => [c,c+5,c+10,c+15])] : classicLines, [size])
  const claims = useMemo(() => isUltimate ? ultimateClaims(board) : [], [isUltimate, board])
  const time = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  useEffect(() => {
    if (mode.name !== 'Blitz' || secondsLeft <= 0 || winning.length) return
    const timer = window.setInterval(() => setSecondsLeft(v => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [mode.name, secondsLeft, winning.length])

  useEffect(() => {
    if (matchType !== 'bot' || turn !== 'O' || winning.length || mode.name === 'Lights Out' || board.every(Boolean)) return
    const timer = window.setTimeout(() => {
      const move = isUltimate ? chooseUltimateBotMove(board, claims) : chooseBotMove(board, 'O', lines)
      if (move !== undefined) play(move, true)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [matchType, turn, winning.length, board, mode.name, lines])

  useEffect(() => {
    if (mode.name !== 'Memory' || board.every(v => !v)) return
    setHidden(true)
    const timer = window.setTimeout(() => setHidden(false), 900)
    return () => window.clearTimeout(timer)
  }, [moves])

  function endGame(text: string, result: number, line: number[] = []) {
    setWinning(line); setMessage(text)
    if (mode.name !== 'Zen') { const change = result === 0.5 ? 0 : eloDelta(rating, opponentRating, result); setDelta(change); setRating(v => v + change) }
  }

  function play(index: number, isBot = false) {
    if (winning.length || (!isBot && matchType === 'bot' && turn === 'O') || (mode.name === 'Blitz' && secondsLeft <= 0)) return
    if (isLightsOut) {
      const next = [...board]
      const row = Math.floor(index / 3); const col = index % 3
      ;[[row,col],[row-1,col],[row+1,col],[row,col-1],[row,col+1]].forEach(([r,c]) => { if (r >= 0 && r < 3 && c >= 0 && c < 3) { const i = r*3+c; next[i] = next[i] ? '' : turn } })
      const count = moves + 1; setMoves(count); setBoard(next); setTurn(turn === 'X' ? 'O' : 'X')
      if (next.every(v => !v)) endGame(`${turn} cleared the board`, turn === 'X' ? 1 : 0, [])
      else if (count >= 12) { const x = next.filter(v => v === 'X').length; const o = next.filter(v => v === 'O').length; endGame(x === o ? 'Lights Out draw' : `${x < o ? 'X' : 'O'} wins by fewer lights`, x === o ? 0.5 : x < o ? 1 : 0, []) }
      else setMessage(`Lights Out · ${12 - count} flips left`)
      return
    }
    if (isUltimate) {
      const miniBoard = Math.floor(index / 9)
      if (board[index] || claims[miniBoard]) return
      const next = [...board]; next[index] = turn
      const count = moves + 1; setMoves(count); setBoard(next)
      const nextClaims = ultimateClaims(next)
      const claimedCount = nextClaims.filter(Boolean).length
      if (claimedCount === 9 || next.every(Boolean)) {
        const x = nextClaims.filter(v => v === 'X').length; const o = nextClaims.filter(v => v === 'O').length
        endGame(x === o ? 'Ultimate draw' : `${x > o ? 'Player 1' : matchType === 'bot' ? 'Arcade Bot' : 'Player 2'} wins ${x}-${o} tiles`, x === o ? 0.5 : x > o ? 1 : 0, [])
        return
      }
      const nextTurn = turn === 'X' ? 'O' : 'X'; setTurn(nextTurn); setMessage(nextTurn === 'O' && matchType === 'bot' ? 'Arcade Bot is thinking...' : `Player ${nextTurn === 'X' ? '1' : '2'} move`)
      return
    }
    let target = index
    if (mode.name === 'Gravity') { const col = index % 3; target = [6+col, 3+col, col].find(i => !board[i]) ?? -1; if (target < 0) return }
    if (board[target]) return
    const next = [...board]; next[target] = turn
    if (mode.name === 'Mirror') { const mirror = 8 - target; if (!next[mirror]) next[mirror] = turn === 'X' ? 'O' : 'X' }
    if (mode.name === 'Wild West' && Math.random() < 0.22) { const open = next.map((v,i) => v ? i : -1).filter(i => i >= 0); if (open.length) next[open[Math.floor(Math.random()*open.length)]] = '' }
    const count = moves + 1; setMoves(count); setBoard(next)
    const line = winner(next, lines)
    if (line) { endGame(`${turn === 'X' ? 'Player 1' : matchType === 'bot' ? 'Arcade Bot' : 'Player 2'} wins`, turn === 'X' ? 1 : 0, line); return }
    if (mode.name === 'Mosaic' && (next.every(Boolean) || count >= 9)) { const x = next.filter(v => v === 'X').length; const o = next.filter(v => v === 'O').length; endGame(x === o ? 'Mosaic draw' : `${x > o ? 'X' : 'O'} owns the mosaic`, x === o ? 0.5 : x > o ? 1 : 0); return }
    if (next.every(Boolean)) { endGame('Draw game', 0.5); return }
    const nextTurn = turn === 'X' ? 'O' : 'X'; setTurn(nextTurn); setMessage(nextTurn === 'O' && matchType === 'bot' ? 'Arcade Bot is thinking...' : `Player ${nextTurn === 'X' ? '1' : '2'} move`)
  }

  function reset() { setBoard(emptyBoard(cellCountFor(mode.name))); setTurn('X'); setWinning([]); setMessage('Your move'); setDelta(null); setMoves(0); setHidden(false); setSecondsLeft(30) }
  function changeMode(index: number) { setSelected(index); setBoard(emptyBoard(cellCountFor(modes[index].name))); setTurn('X'); setWinning([]); setMessage('Your move'); setDelta(null); setMoves(0); setHidden(false); setSecondsLeft(30) }

  const ruleText: Record<ModeName, string> = {
    Classic: 'Players alternate placing one mark. Three in a row wins.', Ultimate: 'The board is divided into nine mini-boards. Win a mini-board to claim its tile; most claimed tiles wins.', Gravity: 'Choose a column. Marks fall to the lowest open space. Four connected marks wins.', Hexagon: 'A 5 × 5 field gives you more room. Connect four horizontally or vertically to win.', 'Lights Out': 'Each flip changes your cell and its neighbors. Both players alternate for 12 flips; whoever leaves fewer lights wins. No instant line wins.', Blitz: 'Classic rules with a shared 30-second clock. When time expires, the opponent wins.', 'Wild West': 'Place marks normally, but every move has a chance to remove a random mark. Three in a row wins.', Mirror: 'Your mark also places an opposite mark in the mirrored cell. Three in a row wins.', Mosaic: 'Fill the board, then compare territory. The player with more marks wins.', Memory: 'Marks flash briefly after a move, then hide. Remember the board and claim three in a row.', Chaos: 'Every turn changes the active twist. Watch the status line and adapt.', Zen: 'A relaxed practice board. Wins and draws do not change your Elo rating.',
  }

  return <main className="min-h-screen overflow-hidden bg-background font-sans text-foreground">
    <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 md:px-10"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Gamepad2 size={21}/></div><div><p className="font-serif text-xl font-bold leading-none tracking-tight">TikTakToe Arcade</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">stacked with game modes</p></div></div><nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground md:flex"><a className="text-foreground" href="#play">Play</a><a href="#variants">Variants</a><button onClick={() => setShowRules(true)} className="hover:text-foreground">How it works</button></nav><div className="flex items-center gap-1 rounded-full border border-border bg-card p-1" role="group" aria-label="Match type"><button onClick={() => { setMatchType('1v1'); reset() }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${matchType === '1v1' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>1v1</button><button onClick={() => { setMatchType('bot'); reset() }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${matchType === 'bot' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Player vs Bot</button></div></header>
    <section id="play" className="mx-auto grid max-w-[1440px] gap-8 px-5 pb-10 pt-8 md:grid-cols-[1fr_1.08fr] md:px-10 md:pb-16 md:pt-14"><div className="flex flex-col justify-center"><div className="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary"/> arcade game night</div><h1 className="max-w-xl font-serif text-5xl font-black leading-[0.94] tracking-[-0.05em] md:text-7xl">Experiment with the<br/><span className="text-primary">game you thought you knew.</span></h1><p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">Classic rules, unexpected twists, and competitive ratings for every match.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={reset} className="flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-primary-foreground shadow-xl shadow-primary/25 transition hover:-translate-y-1">Play this mode <ChevronRight size={18}/></button><button onClick={() => setShowRules(true)} className="flex items-center gap-2 rounded-full border border-border px-5 py-3.5 font-bold text-muted-foreground"><Info size={18} className="text-accent"/> How it works</button></div><div className="mt-10 flex items-center gap-4 border-t border-border pt-5"><Trophy size={20} className="text-accent"/><div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your arcade rating</p><p className="font-serif text-2xl font-bold">{rating} <span className="font-sans text-sm text-muted-foreground">Elo</span></p></div>{delta !== null && <span className={`rounded-full px-3 py-1 text-sm font-black ${delta >= 0 ? 'bg-accent/20 text-accent-foreground' : 'bg-primary/15 text-primary'}`}>{delta >= 0 ? '+' : ''}{delta}</span>}</div></div>
      <div className="relative flex items-center justify-center rounded-[2.5rem] bg-secondary p-5 shadow-2xl shadow-secondary/20 md:p-10"><div className="absolute left-7 top-7 flex items-center gap-2 rounded-full bg-card/90 px-3 py-2 text-xs font-bold shadow-sm"><span className="h-2 w-2 rounded-full bg-green-500"/> {matchType === 'bot' ? 'Bot arena' : 'Local room'}</div><button aria-label="How it works" onClick={() => setShowRules(true)} className="absolute right-7 top-7 rounded-full bg-card/90 p-2.5 shadow-sm"><Info size={16} className="text-muted-foreground"/></button><div className="w-full max-w-[470px] pt-10"><div className="mb-6 flex items-end justify-between text-secondary-foreground"><div><p className="text-xs font-bold uppercase tracking-widest opacity-70">round 04 · {mode.name.toLowerCase()}</p><p className="mt-1 font-serif text-3xl font-bold">{message}</p></div><div className="flex items-center gap-1.5 text-sm font-bold"><Clock3 size={16}/> {mode.name === 'Blitz' ? time : '∞'}</div></div>{isUltimate
        ? <div className="grid grid-cols-3 gap-2 rounded-3xl bg-card/20 p-2 backdrop-blur-sm">{Array.from({ length: 9 }, (_, b) => <div key={b} className={`grid grid-cols-3 gap-1 rounded-xl p-1.5 transition ${claims[b] ? 'bg-accent/50' : 'bg-card/40'}`}>{Array.from({ length: 9 }, (_, c) => { const i = b * 9 + c; const mark = board[i]; return <button key={i} onClick={() => play(i)} disabled={!!claims[b]} aria-label={`Mini-board ${b + 1} cell ${c + 1}`} className={`aspect-square rounded-md bg-card text-base font-black shadow-sm transition hover:scale-[0.96] md:text-xl ${mark === 'X' ? 'text-primary' : 'text-secondary-foreground'}`}>{mark === 'X' ? '×' : mark === 'O' ? '○' : ''}</button> })}</div>)}</div>
        : <div className={`grid gap-2 rounded-3xl bg-card/20 p-2 backdrop-blur-sm ${size === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>{board.map((mark, i) => <button key={i} onClick={() => play(i)} aria-label={`Board cell ${i + 1}`} className={`aspect-square rounded-2xl bg-card text-4xl font-black shadow-sm transition hover:scale-[0.98] md:text-6xl ${winning.includes(i) ? 'bg-accent text-accent-foreground' : mark === 'X' ? 'text-primary' : 'text-secondary-foreground'}`}>{hidden && mode.name === 'Memory' && mark ? '?' : mark === 'X' ? '×' : mark === 'O' ? '○' : ''}</button>)}</div>}<div className="mt-5 flex items-center justify-between text-secondary-foreground"><span className="flex items-center gap-2 text-sm font-bold"><span className="text-2xl font-black text-primary">×</span> Player 1 <span className="opacity-60">{rating}</span></span><button onClick={reset} className="flex items-center gap-2 rounded-full bg-card/70 px-3 py-2 text-xs font-bold"><RotateCcw size={14}/> Reset</button><span className="flex items-center gap-2 text-sm font-bold"><span className="text-2xl font-black text-secondary-foreground">○</span> {matchType === 'bot' ? 'Arcade Bot' : 'Player 2'} <span className="opacity-60">{opponentRating}</span></span></div></div></div></section>
    <section id="variants" className="border-t border-border bg-card px-5 py-12 md:px-10 md:py-16"><div className="mx-auto max-w-[1440px]"><div className="mb-8 flex items-end justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">the collection</p><h2 className="font-serif text-4xl font-black tracking-tight md:text-5xl">Pick your mode.</h2></div><p className="hidden max-w-xs text-right text-sm leading-relaxed text-muted-foreground md:block">Twelve ways to play. One rating to climb.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{modes.map((item, i) => <button key={item.name} onClick={() => changeMode(i)} className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-1 hover:shadow-lg ${selected === i ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-border bg-background'}`}><span className={`mb-7 block text-3xl font-black ${selected === i ? 'text-primary-foreground' : 'text-primary'}`}>{item.icon}</span><span className="block font-bold">{item.name}</span><span className={`mt-1 block text-xs ${selected === i ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{item.detail}</span></button>)}</div></div></section>
    <footer className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10"><span>Built for serious game-night people.</span><span className="flex gap-5"><button onClick={() => setShowRules(true)} className="hover:text-foreground">Rules</button><span>© 2026 TikTakToe Arcade</span></span></footer>
    {showRules && <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-5" role="dialog" aria-modal="true" aria-labelledby="rules-title"><div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-primary">mode rules</p><h2 id="rules-title" className="mt-1 font-serif text-3xl font-black">How {mode.name} works</h2></div><button aria-label="Close rules" onClick={() => setShowRules(false)} className="rounded-full p-2 hover:bg-muted"><X size={18}/></button></div><p className="mt-5 text-base leading-relaxed text-muted-foreground">{ruleText[mode.name]}</p><div className="mt-6 rounded-2xl bg-secondary p-4 text-sm"><span className="font-bold">{mode.name === 'Zen' ? 'Practice mode' : 'Rating match'}</span><span className="ml-3 text-muted-foreground">{mode.name === 'Lights Out' ? '12-flip comparison' : 'Elo updates after results'}</span></div><button onClick={() => setShowRules(false)} className="mt-6 w-full rounded-full bg-primary py-3 font-bold text-primary-foreground">Got it</button></div></div>}
  </main>
}
