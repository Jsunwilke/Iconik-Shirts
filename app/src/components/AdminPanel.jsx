import { useState, useEffect } from 'react'
import {
  getPendingOrders,
  getOrderBatches,
  getOrdersByBatch,
  deleteOrder,
  getArchivedOrders,
  archiveOrders,
  restoreOrders,
  deleteOrders
} from '../lib/supabase'

const ADMIN_PASSWORD = 'iconik2024'

// Orders store outerwear only as a type; map it to the S&S style name.
const OUTERWEAR_STYLE = {
  crewneck: 'Gildan 18000',
  hoodie: 'Gildan 18500',
}

// Canonical size order so the breakdown reads S,M,L,... not alphabetical.
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
const sizeRank = (s) => {
  const i = SIZE_ORDER.indexOf(s)
  return i === -1 ? 99 : i
}

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingOrders, setPendingOrders] = useState([])
  const [archivedOrders, setArchivedOrders] = useState([])
  const [orderBatches, setOrderBatches] = useState([])
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchOrders, setBatchOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cart-list builder state
  const [building, setBuilding] = useState(false)
  const [cartText, setCartText] = useState('')
  const [cartStatus, setCartStatus] = useState('')

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

  const loadArchivedOrders = async () => {
    setLoading(true)
    try {
      const data = await getArchivedOrders()
      setArchivedOrders(data || [])
    } catch (err) {
      console.error('Failed to load archived orders:', err)
      setError('Failed to load archived orders')
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
    } else if (authenticated && activeTab === 'archived') {
      loadArchivedOrders()
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

  const handleArchive = async (id) => {
    try {
      await archiveOrders([id])
      setPendingOrders(pendingOrders.filter(o => o.id !== id))
    } catch (err) {
      console.error('Failed to archive:', err)
      alert(err.message || 'Failed to archive order')
    }
  }

  const handleArchiveAll = async () => {
    if (pendingOrders.length === 0) return
    if (!confirm(
      `Archive all ${pendingOrders.length} pending order${pendingOrders.length !== 1 ? 's' : ''}? ` +
      `They stay in the database and can be restored from the Archived tab.`
    )) return

    try {
      await archiveOrders(pendingOrders.map(o => o.id))
      setPendingOrders([])
    } catch (err) {
      console.error('Failed to archive orders:', err)
      alert(err.message || 'Failed to archive orders')
    }
  }

  const handleRestore = async (id) => {
    try {
      await restoreOrders([id])
      setArchivedOrders(archivedOrders.filter(o => o.id !== id))
    } catch (err) {
      console.error('Failed to restore:', err)
      alert(err.message || 'Failed to restore order')
    }
  }

  const handleDeleteArchived = async (id) => {
    if (!confirm('Permanently delete this order? This cannot be undone.')) return

    try {
      await deleteOrder(id)
      setArchivedOrders(archivedOrders.filter(o => o.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('Failed to delete order')
    }
  }

  const handleDeleteAllArchived = async () => {
    if (archivedOrders.length === 0) return
    if (!confirm(
      `Permanently delete all ${archivedOrders.length} archived order${archivedOrders.length !== 1 ? 's' : ''}? ` +
      `This cannot be undone.`
    )) return

    try {
      await deleteOrders(archivedOrders.map(o => o.id))
      setArchivedOrders([])
    } catch (err) {
      console.error('Failed to delete orders:', err)
      alert('Failed to delete orders')
    }
  }

  // Turn all pending orders into real S&S SKUs + quantities for a Quick Order
  // paste. Resolves SKUs live from /api/skus (keyed by color name + size) so we
  // never rely on placeholder identifiers. Returns the paste text plus any items
  // whose SKU couldn't be resolved, so nothing is silently dropped.
  // Group every pending-order item by style -> color -> size with quantities.
  // S&S product pages let you enter quantities for a whole style's size grid at
  // once, so this is the checklist you read off while filling each style's page.
  const buildOrderBreakdown = () => {
    // styleLabel -> color -> size -> qty
    const styles = {}
    let total = 0
    const addItem = (styleLabel, color, size) => {
      if (!styleLabel || !color || !size) return
      styles[styleLabel] = styles[styleLabel] || {}
      styles[styleLabel][color] = styles[styleLabel][color] || {}
      styles[styleLabel][color][size] = (styles[styleLabel][color][size] || 0) + 1
      total++
    }

    pendingOrders.forEach(order => {
      for (let i = 1; i <= 3; i++) {
        addItem(order[`tshirt_${i}_style`], order[`tshirt_${i}_color`], order[`tshirt_${i}_size`])
      }
      if (order.outerwear_type && order.outerwear_color && order.outerwear_size) {
        const style = OUTERWEAR_STYLE[order.outerwear_type]
        const label = style ? `${style} (${order.outerwear_type})` : order.outerwear_type
        addItem(label, order.outerwear_color, order.outerwear_size)
      }
    })

    const blocks = Object.keys(styles).sort().map(styleLabel => {
      const colors = styles[styleLabel]
      let subtotal = 0
      const lines = Object.keys(colors).sort().map(color => {
        const sizes = Object.entries(colors[color])
          .sort((a, b) => sizeRank(a[0]) - sizeRank(b[0]))
          .map(([size, qty]) => { subtotal += qty; return `${size}×${qty}` })
          .join('   ')
        return `  ${color}:  ${sizes}`
      })
      return `${styleLabel}  (${subtotal} pcs)\n${lines.join('\n')}`
    })

    return { text: blocks.join('\n\n'), total, styleCount: blocks.length }
  }

  const handleBuildCart = async () => {
    if (pendingOrders.length === 0) return
    setBuilding(true)
    setError('')
    setCartStatus('')
    try {
      const { text, total, styleCount } = buildOrderBreakdown()
      setCartText(text)
      if (!text) {
        setCartStatus('No items to build.')
      } else {
        try {
          await navigator.clipboard.writeText(text)
          setCartStatus(`Copied — ${total} pieces across ${styleCount} style${styleCount !== 1 ? 's' : ''}.`)
        } catch {
          setCartStatus(`Built ${total} pieces across ${styleCount} style${styleCount !== 1 ? 's' : ''} — select the text below to copy.`)
        }
      }
    } catch (err) {
      console.error('Failed to build breakdown:', err)
      setError(err.message || 'Failed to build breakdown')
    } finally {
      setBuilding(false)
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
              onClick={() => setActiveTab('archived')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'archived'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived
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
            {/* Order breakdown for filling the S&S cart */}
            {pendingOrders.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Shopping Breakdown for S&S</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Totals every pending order by style, color, and size. On ssactivewear.com, open each
                  style's product page and enter these quantities in the size grid, then add to cart —
                  you can add anything else you need before checking out. No order is placed from this app.
                </p>

                <button
                  onClick={handleBuildCart}
                  disabled={building}
                  className={`py-3 px-5 rounded-lg font-semibold text-white transition-colors ${
                    building ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {building ? 'Building…' : 'Build Shopping Breakdown'}
                </button>

                {cartStatus && (
                  <p className="mt-3 text-sm font-medium text-green-700">{cartStatus}</p>
                )}

                {cartText && (
                  <div className="mt-4">
                    <label className="block text-xs text-gray-500 mb-1">
                      Quantities by style → color → size
                    </label>
                    <textarea
                      readOnly
                      value={cartText}
                      onFocus={(e) => e.target.select()}
                      rows={Math.min(cartText.split('\n').length + 1, 24)}
                      className="w-full font-mono text-sm px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      After checking out on S&S, use <span className="font-medium">Archive All</span> to
                      clear these from pending.
                    </p>
                  </div>
                )}
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
                <button
                  onClick={handleArchiveAll}
                  disabled={pendingOrders.length === 0}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  Archive All
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
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleArchive(order.id)}
                          className="text-amber-700 hover:text-amber-800 text-sm"
                        >
                          Archive
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
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

        {activeTab === 'archived' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {archivedOrders.length} archived order{archivedOrders.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={loadArchivedOrders}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Refresh
                </button>
                <button
                  onClick={handleDeleteAllArchived}
                  disabled={archivedOrders.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Delete All Permanently
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-600 py-12">Loading archived orders...</div>
            ) : archivedOrders.length === 0 ? (
              <div className="text-center text-gray-600 py-12 bg-white rounded-lg shadow-sm">
                No archived orders
              </div>
            ) : (
              <div className="space-y-4">
                {archivedOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">{order.employee_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleRestore(order.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDeleteArchived(order.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
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
