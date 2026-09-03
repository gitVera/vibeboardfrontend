type SymbolConfig = {
  char: string
  className: string
}

const symbols: SymbolConfig[] = [
  { char: '{', className: 'left-[8%] top-[18%] text-[9rem] opacity-70 animate-float blur-[1px]' },
  { char: '}', className: 'right-[10%] top-[22%] text-[7rem] opacity-50 animate-float-slow' },
  { char: '#', className: 'right-[14%] top-[8%] text-[8rem] opacity-80 animate-float-delayed' },
  { char: '/', className: 'bottom-[12%] left-1/2 -translate-x-1/2 text-[10rem] opacity-60 blur-sm animate-float-slow' },
  { char: '!', className: 'left-[18%] bottom-[20%] text-[6rem] opacity-40 animate-float-delayed blur-[2px]' },
  { char: '@', className: 'right-[22%] bottom-[28%] text-[5rem] opacity-35 animate-float blur-[3px]' },
]

export function FloatingSymbols() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {symbols.map((symbol) => (
        <span key={symbol.char + symbol.className} className={`vibe-symbol ${symbol.className}`}>
          {symbol.char}
        </span>
      ))}
    </div>
  )
}
