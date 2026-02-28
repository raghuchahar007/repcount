interface ErrorCardProps {
  message: string
  onRetry?: () => void
}

export default function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="bg-status-red/10 border border-status-red/20 rounded-2xl p-6 text-center">
      <p className="text-status-red text-sm mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-status-red/20 text-status-red rounded-xl text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
