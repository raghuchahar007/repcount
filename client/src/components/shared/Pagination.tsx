interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg bg-bg-card text-text-secondary text-sm disabled:opacity-30"
      >
        Prev
      </button>
      <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg bg-bg-card text-text-secondary text-sm disabled:opacity-30"
      >
        Next
      </button>
    </div>
  )
}
