import { useState, useEffect } from 'react'
import { getOrders, deleteOrder } from '../lib/supabase'

const ADMIN_PASSWORD = 'iconik2024'

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      loadOrders()
    } else {
      setError('Incorrect password')
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await getOrders()
      setOrders(data || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      await deleteOrder(id)
      setOrders(orders.filter(o => o.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('Failed to delete order')
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Employee Name',
      'T-Shirt 1 Style', 'T-Shirt 1 Color', 'T-Shirt 1 Size',
      'T-Shirt 2 Style', 'T-Shirt 2 Color', 'T-Shirt 2 Size',
      'T-Shirt 3 Style', 'T-Shirt 3 Color', 'T-Shirt 3 Size',
      'Outerwear Type', 'Outerwear Color', 'Outerwear Size',
      'Submitted At'
    ]

    const rows = orders.map(o => [
      o.employee_name,
      o.tshirt_1_style, o.tshirt_1_color, o.tshirt_1_size,
      o.tshirt_2_style, o.tshirt_2_color, o.tshirt_2_size,
      o.tshirt_3_style, o.tshirt_3_color, o.tshirt_3_size,
      o.outerwear_type, o.outerwear_color, o.outerwear_size,
      new Date(o.created_at).toLocaleString()
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shirt-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Admin Login
          </h1>
          <form onSubmit={handleLogin} className="bg-white rounded-lg shadow-md p-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Login
            </button>
          </form>
          <p className="text-center mt-4">
            <a href="/" className="text-blue-600 hover:underline">
              ← Back to Order Form
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Order Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={loadOrders}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              disabled={orders.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center text-gray-600">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            No orders yet
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {orders.length} order{orders.length !== 1 ? 's' : ''} total
            </p>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{order.employee_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">T-Shirt 1:</span>{' '}
                      {order.tshirt_1_style} - {order.tshirt_1_color} ({order.tshirt_1_size})
                    </div>
                    <div>
                      <span className="text-gray-500">T-Shirt 2:</span>{' '}
                      {order.tshirt_2_style} - {order.tshirt_2_color} ({order.tshirt_2_size})
                    </div>
                    <div>
                      <span className="text-gray-500">T-Shirt 3:</span>{' '}
                      {order.tshirt_3_style} - {order.tshirt_3_color} ({order.tshirt_3_size})
                    </div>
                    <div>
                      <span className="text-gray-500">Outerwear:</span>{' '}
                      {order.outerwear_type} - {order.outerwear_color} ({order.outerwear_size})
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full bg-white rounded-lg shadow-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">T-Shirt 1</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">T-Shirt 2</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">T-Shirt 3</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outerwear</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-4 py-3 font-medium text-gray-800">{order.employee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.tshirt_1_style}<br/>
                        {order.tshirt_1_color} ({order.tshirt_1_size})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.tshirt_2_style}<br/>
                        {order.tshirt_2_color} ({order.tshirt_2_size})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.tshirt_3_style}<br/>
                        {order.tshirt_3_color} ({order.tshirt_3_size})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {order.outerwear_type}<br/>
                        {order.outerwear_color} ({order.outerwear_size})
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
