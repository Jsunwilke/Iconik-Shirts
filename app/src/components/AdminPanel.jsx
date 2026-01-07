import { useState, useEffect } from 'react'
import { getPendingOrders, getOrderBatches, getOrdersByBatch, markOrdersCompleted, deleteOrder } from '../lib/supabase'

const ADMIN_PASSWORD = 'iconik2024'

const SHIPPING_METHODS = [
  { code: 1, name: 'Ground (S&S Chooses Carrier)' },
  { code: 54, name: 'Cheapest Ground (USPS/UPS/FedEx)' },
  { code: 14, name: 'FedEx Ground' },
  { code: 40, name: 'UPS Ground' },
  { code: 16, name: 'UPS 3 Day Select' },
  { code: 3, name: 'UPS 2nd Day Air' },
  { code: 48, name: 'FedEx 2nd Day Air' },
  { code: 2, name: 'UPS Next Day Air' },
  { code: 21, name: 'UPS Next Day Air Saver' },
  { code: 26, name: 'FedEx Next Day Priority' },
  { code: 27, name: 'FedEx Next Day Standard' },
  { code: 6, name: 'Will Call / Pickup' },
]

const DEFAULT_ADDRESS = {
  customer: 'Iconik',
  attn: '',
  address: '',
  city: '',
  state: 'IL',
  zip: '',
  residential: false
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingOrders, setPendingOrders] = useState([])
  const [orderBatches, setOrderBatches] = useState([])
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchOrders, setBatchOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Shipping form state
  const [shippingMethod, setShippingMethod] = useState(1)
  const [shippingAddress, setShippingAddress] = useState(DEFAULT_ADDRESS)
  const [testOrder, setTestOrder] = useState(true) // Default to test mode for safety

  const handleLogin = (e) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true)
      loadPendingOrders()
    } else {
      setError('Incorrect password')
    }
  }

  const loadPendingOrders = async () => {
    setLoading(true)
    try {
      const data = await getPendingOrders()
      setPendingOrders(data || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const loadOrderHistory = async () => {
    setLoading(true)
    try {
      const batches = await getOrderBatches()
      setOrderBatches(batches || [])
    } catch (err) {
      console.error('Failed to load order history:', err)
      setError('Failed to load order history')
    } finally {
      setLoading(false)
    }
  }

  const loadBatchOrders = async (ssOrderId) => {
    if (expandedBatch === ssOrderId) {
      setExpandedBatch(null)
      setBatchOrders([])
      return
    }
    try {
      const orders = await getOrdersByBatch(ssOrderId)
      setBatchOrders(orders || [])
      setExpandedBatch(ssOrderId)
    } catch (err) {
      console.error('Failed to load batch orders:', err)
    }
  }

  useEffect(() => {
    if (authenticated && activeTab === 'pending') {
      loadPendingOrders()
    } else if (authenticated && activeTab === 'history') {
      loadOrderHistory()
    }
  }, [activeTab, authenticated])

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this order?')) return

    try {
      await deleteOrder(id)
      setPendingOrders(pendingOrders.filter(o => o.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('Failed to delete order')
    }
  }

  const aggregateLineItems = () => {
    // Aggregate all items from pending orders into SKU quantities
    const items = {}

    pendingOrders.forEach(order => {
      // T-shirts
      for (let i = 1; i <= 3; i++) {
        const style = order[`tshirt_${i}_style`]
        const color = order[`tshirt_${i}_color`]
        const size = order[`tshirt_${i}_size`]
        if (style && color && size) {
          // Create a key for this item (we'll need to look up SKU later)
          const key = `${style}|${color}|${size}`
          items[key] = (items[key] || 0) + 1
        }
      }

      // Outerwear
      if (order.outerwear_type && order.outerwear_color && order.outerwear_size) {
        const key = `${order.outerwear_type}|${order.outerwear_color}|${order.outerwear_size}`
        items[key] = (items[key] || 0) + 1
      }
    })

    // Convert to line items format
    // Note: For now, using style|color|size as identifier - would need SKU lookup in production
    return Object.entries(items).map(([key, qty]) => ({
      identifier: key, // This should be the actual SKU from SS Activewear
      qty
    }))
  }

  const handlePlaceOrder = async () => {
    if (pendingOrders.length === 0) {
      alert('No pending orders to submit')
      return
    }

    if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.zip) {
      alert('Please fill in the shipping address')
      return
    }

    const confirmMsg = testOrder
      ? 'Submit as TEST order? (No actual order will be placed)'
      : 'Submit REAL order to SS Activewear? This will place an actual order!'

    if (!confirm(confirmMsg)) return

    setSubmitting(true)
    setError('')

    try {
      const lineItems = aggregateLineItems()

      const response = await fetch('/api/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineItems,
          shippingMethod,
          shippingAddress,
          testOrder,
          poNumber: `ICONIK-${new Date().toISOString().split('T')[0]}`
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit order')
      }

      // Mark orders as completed
      const orderIds = pendingOrders.map(o => o.id)
      const ssOrderId = result.order?.orderNumber || `SS-${Date.now()}`
      await markOrdersCompleted(orderIds, ssOrderId)

      alert(`Order submitted successfully!\nOrder #: ${ssOrderId}${testOrder ? ' (TEST)' : ''}`)

      // Refresh the pending orders list
      loadPendingOrders()

    } catch (err) {
      console.error('Failed to place order:', err)
      setError(err.message || 'Failed to place order')
      alert('Failed to place order: ' + err.message)
    } finally {
      setSubmitting(false)
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

    const rows = pendingOrders.map(o => [
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800">Order Admin</h1>
            <a href="/" className="text-blue-600 hover:underline text-sm">
              ← Back to Order Form
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b">
            <button
              onClick={() => setActiveTab('pending')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Pending Orders
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Order History
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'pending' && (
          <>
            {/* Shipping & Order Section */}
            {pendingOrders.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Place Order with SS Activewear</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Shipping Address */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Shipping Address</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={shippingAddress.customer}
                        onChange={(e) => setShippingAddress({...shippingAddress, customer: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Attention"
                        value={shippingAddress.attn}
                        onChange={(e) => setShippingAddress({...shippingAddress, attn: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Street Address *"
                        value={shippingAddress.address}
                        onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="City *"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                          className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        <input
                          type="text"
                          placeholder="State *"
                          value={shippingAddress.state}
                          onChange={(e) => setShippingAddress({...shippingAddress, state: e.target.value})}
                          className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                        <input
                          type="text"
                          placeholder="ZIP *"
                          value={shippingAddress.zip}
                          onChange={(e) => setShippingAddress({...shippingAddress, zip: e.target.value})}
                          className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Method */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Shipping Method</h3>
                    <select
                      value={shippingMethod}
                      onChange={(e) => setShippingMethod(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                    >
                      {SHIPPING_METHODS.map(method => (
                        <option key={method.code} value={method.code}>
                          {method.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="testOrder"
                        checked={testOrder}
                        onChange={(e) => setTestOrder(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <label htmlFor="testOrder" className="text-sm text-gray-600">
                        Test Order (won't actually place order)
                      </label>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      disabled={submitting || pendingOrders.length === 0}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                        submitting
                          ? 'bg-gray-400 cursor-not-allowed'
                          : testOrder
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {submitting ? 'Submitting...' : testOrder ? 'Submit Test Order' : 'Place Real Order'}
                    </button>

                    {!testOrder && (
                      <p className="text-xs text-red-600 mt-2">
                        Warning: This will place a real order with SS Activewear
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {pendingOrders.length} pending order{pendingOrders.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={loadPendingOrders}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Refresh
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={pendingOrders.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Pending Orders List */}
            {loading ? (
              <div className="text-center text-gray-600 py-12">Loading orders...</div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow-sm">
                No pending orders
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">T-Shirt 1:</span><br/>
                        {order.tshirt_1_style} - {order.tshirt_1_color} ({order.tshirt_1_size})
                      </div>
                      <div>
                        <span className="text-gray-500">T-Shirt 2:</span><br/>
                        {order.tshirt_2_style} - {order.tshirt_2_color} ({order.tshirt_2_size})
                      </div>
                      <div>
                        <span className="text-gray-500">T-Shirt 3:</span><br/>
                        {order.tshirt_3_style} - {order.tshirt_3_color} ({order.tshirt_3_size})
                      </div>
                      <div>
                        <span className="text-gray-500">Outerwear:</span><br/>
                        {order.outerwear_type} - {order.outerwear_color} ({order.outerwear_size})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {orderBatches.length} past order{orderBatches.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={loadOrderHistory}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="text-center text-gray-600 py-12">Loading order history...</div>
            ) : orderBatches.length === 0 ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow-sm">
                No order history yet
              </div>
            ) : (
              <div className="space-y-4">
                {orderBatches.map((batch) => (
                  <div key={batch.ss_order_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <button
                      onClick={() => loadBatchOrders(batch.ss_order_id)}
                      className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">Order #{batch.ss_order_id}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(batch.ss_order_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-gray-400">
                        {expandedBatch === batch.ss_order_id ? '▼' : '▶'}
                      </span>
                    </button>

                    {expandedBatch === batch.ss_order_id && batchOrders.length > 0 && (
                      <div className="border-t px-4 py-3 bg-gray-50">
                        <p className="text-sm text-gray-600 mb-2">
                          {batchOrders.length} employee{batchOrders.length !== 1 ? 's' : ''} in this order
                        </p>
                        <div className="space-y-2">
                          {batchOrders.map((order) => (
                            <div key={order.id} className="text-sm">
                              <span className="font-medium">{order.employee_name}</span>
                              <span className="text-gray-500"> - </span>
                              <span className="text-gray-600">
                                {order.tshirt_1_color}, {order.tshirt_2_color}, {order.tshirt_3_color}, {order.outerwear_color}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
