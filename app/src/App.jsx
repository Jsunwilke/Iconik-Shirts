import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EmployeeForm from './components/EmployeeForm'
import TShirtSelector from './components/TShirtSelector'
import OuterwearSelector from './components/OuterwearSelector'
import OrderSummary from './components/OrderSummary'
import Confirmation from './components/Confirmation'
import AdminPanel from './components/AdminPanel'

function OrderFlow() {
  const [step, setStep] = useState(1)
  const [employeeName, setEmployeeName] = useState('')
  const [tshirts, setTshirts] = useState([])
  const [outerwear, setOuterwear] = useState(null)

  const resetOrder = () => {
    setStep(1)
    setEmployeeName('')
    setTshirts([])
    setOuterwear(null)
  }

  switch (step) {
    case 1:
      return (
        <EmployeeForm
          initialName={employeeName}
          onSubmit={(name) => {
            setEmployeeName(name)
            setStep(2)
          }}
        />
      )

    case 2:
      return (
        <TShirtSelector
          selections={tshirts}
          onUpdate={setTshirts}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )

    case 3:
      return (
        <OuterwearSelector
          selection={outerwear}
          onUpdate={setOuterwear}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )

    case 4:
      return (
        <OrderSummary
          employeeName={employeeName}
          tshirts={tshirts}
          outerwear={outerwear}
          onBack={() => setStep(3)}
          onComplete={() => setStep(5)}
        />
      )

    case 5:
      return (
        <Confirmation
          employeeName={employeeName}
          onNewOrder={resetOrder}
        />
      )

    default:
      return null
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OrderFlow />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
