import { useState } from 'react'

export default function EmployeeForm({ onSubmit, initialName = '' }) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    setError('')
    onSubmit(name.trim())
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Iconik Shirt Order
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Select your company shirts
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium text-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Start Order
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          You'll select 3 t-shirts + 1 crew neck or hoodie
        </p>
      </div>
    </div>
  )
}
