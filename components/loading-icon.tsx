export default function Loading({ size }: { size: string }) {
  // DOTS (xs, sm)
  if (size === 'xs' || size === 'sm') {
    const dotSize = size === 'xs' ? 'h-1 w-1' : 'h-1.5 w-1.5'

    return (
      <div className="flex items-center justify-center gap-1">
        <div className={`${dotSize} bg-green-600 rounded-full animate-bounce [animation-delay:-0.2s]`} />
        <div className={`${dotSize} bg-green-600 rounded-full animate-bounce [animation-delay:-0.1s]`} />
        <div className={`${dotSize} bg-green-600 rounded-full animate-bounce`} />
      </div>
    )
  }

  // BAR (base, lg)
  const sizeMap = {
    base: "h-2 w-24",
    lg: "h-3 w-32"
  }

  const bar = sizeMap[size as keyof typeof sizeMap] || sizeMap.base

  return (
    <div className={`relative overflow-hidden rounded-full bg-gray-200 ${bar}`}>
      <div className="absolute inset-y-0 left-0 w-1/3 bg-green-600 rounded-full animate-loading-slide" />
    </div>
  )
}