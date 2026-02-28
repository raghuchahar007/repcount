import { Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <div className="max-w-mobile mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-accent-orange mb-2">RepCount</h1>
              <p className="text-text-secondary">Your Gym, Upgraded</p>
              <p className="text-text-muted text-sm mt-4">MERN Stack — M0 Complete</p>
            </div>
          </div>
        } />
      </Routes>
    </div>
  )
}
