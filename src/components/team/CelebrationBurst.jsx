const CYCLE_COUNT = 3
const CYCLE_GAP_MS = 2100
const BASE_DELAY_MS = 180

const CONFETTI_COLORS = [
  '#FF4D8D',
  '#416DFC',
  '#FE7513',
  '#FACC15',
  '#22C55E',
  '#9333EA',
  '#45AEFE',
  '#FB7185',
]

function buildFallingPieces() {
  const pieces = []

  for (let i = 0; i < 28; i++) {
    const spread = 4 + (i * 3.35) % 92
    pieces.push({
      id: `fall-${i}`,
      left: `${spread}%`,
      drift: `${((i % 9) - 4) * 0.42}rem`,
      sway: `${((i % 5) - 2) * 0.28}rem`,
      fall: `${3.8 + (i % 6) * 0.55}rem`,
      delay: i * 38,
      shape: i % 6,
      rot: `${(i * 41 + 15) % 360}deg`,
    })
  }

  return pieces
}

const FALLING_PIECES = buildFallingPieces()

function withCycles(items) {
  return items.flatMap((item) =>
    Array.from({ length: CYCLE_COUNT }, (_, cycle) => ({
      ...item,
      id: `${item.id}-c${cycle}`,
      delay: item.delay + cycle * CYCLE_GAP_MS,
    })),
  )
}

const PIECES_WITH_CYCLES = withCycles(FALLING_PIECES)

export default function CelebrationBurst() {
  return (
    <div className="sd-celebrate sd-celebrate--fall" aria-hidden>
      {PIECES_WITH_CYCLES.map((piece, i) => (
        <span
          key={piece.id}
          className={`sd-celebrate__piece sd-celebrate__piece--fall sd-celebrate__piece--shape-${piece.shape}`}
          style={{
            left: piece.left,
            '--drift-x': piece.drift,
            '--sway-x': piece.sway,
            '--fall': piece.fall,
            '--rot': piece.rot,
            '--delay': `${BASE_DELAY_MS + piece.delay}ms`,
            '--color': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          }}
        />
      ))}
    </div>
  )
}
