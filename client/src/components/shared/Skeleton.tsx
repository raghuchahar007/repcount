export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-bg-hover rounded-xl animate-pulse ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-bg-card rounded-2xl p-4 space-y-3">
      <SkeletonBox className="h-4 w-3/4" />
      <SkeletonBox className="h-3 w-1/2" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-bg-card rounded-2xl p-4 flex items-center gap-3">
          <SkeletonBox className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBox className="h-4 w-2/3" />
            <SkeletonBox className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBox className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBox key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <SkeletonBox className="h-8 w-1/3" />
      <SkeletonList count={3} />
    </div>
  )
}
