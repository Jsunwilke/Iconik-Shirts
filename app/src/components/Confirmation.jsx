export default function Confirmation({ employeeName, onNewOrder }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Order Submitted!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you, {employeeName}! Your shirt order has been received.
        </p>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-medium text-gray-800 mb-2">What's Next?</h3>
          <p className="text-sm text-gray-600">
            Your order will be compiled with all other employee orders.
            You'll receive your shirts once the group order arrives.
          </p>
        </div>

        <button
          onClick={onNewOrder}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Start New Order
        </button>
      </div>
    </div>
  )
}
