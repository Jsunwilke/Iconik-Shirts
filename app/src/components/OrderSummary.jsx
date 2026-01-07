import { useState } from 'react'
import { submitOrder } from '../lib/supabase'

export default function OrderSummary({
  employeeName,
  tshirts,
  outerwear,
  onBack,
  onComplete
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')

    try {
      const orderData = {
        employee_name: employeeName,
        tshirt_1_style: tshirts[0]?.style || null,
        tshirt_1_color: tshirts[0]?.color || null,
        tshirt_1_size: tshirts[0]?.size || null,
        tshirt_2_style: tshirts[1]?.style || null,
        tshirt_2_color: tshirts[1]?.color || null,
        tshirt_2_size: tshirts[1]?.size || null,
        tshirt_3_style: tshirts[2]?.style || null,
        tshirt_3_color: tshirts[2]?.color || null,
        tshirt_3_size: tshirts[2]?.size || null,
        outerwear_type: outerwear?.type || null,
        outerwear_color: outerwear?.color || null,
        outerwear_size: outerwear?.size || null
      }

      await submitOrder(orderData)
      onComplete()
    } catch (err) {
      console.error('Submit error:', err)
      setError('Failed to submit order. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const OrderItem = ({ label, item }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      {item.productImage ? (
        <img
          src={item.productImage}
          alt={`${item.style} - ${item.color}`}
          className="w-16 h-16 object-contain bg-white rounded"
        />
      ) : (
        <div
          className="w-16 h-16 rounded"
          style={{ backgroundColor: item.hexColor }}
        />
      )}
      <div className="flex-1">
        <p className="font-medium text-gray-800">{label}</p>
        <p className="text-sm text-gray-600">{item.style}</p>
        <p className="text-sm text-gray-500">{item.color} • Size {item.size}</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-gray-800">Review Order</h2>
            <div className="w-16"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Employee Name */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <p className="text-sm text-gray-500">Order for</p>
          <p className="text-xl font-semibold text-gray-800">{employeeName}</p>
        </div>

        {/* T-Shirts */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">T-Shirts (3)</h3>
          <div className="space-y-3">
            {tshirts.map((item, index) => (
              <OrderItem key={index} label={`T-Shirt ${index + 1}`} item={item} />
            ))}
          </div>
        </div>

        {/* Outerwear */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Outerwear (1)</h3>
          <OrderItem
            label={outerwear.type === 'crewneck' ? 'Crew Neck' : 'Hoodie'}
            item={outerwear}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`
              w-full py-4 rounded-lg font-semibold text-lg transition-colors
              ${submitting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
              }
            `}
          >
            {submitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
