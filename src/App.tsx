import { Route, Routes } from 'react-router'
import { ExplorerPage } from './components/ExplorerPage'
import { OrderDrawer } from './components/OrderDrawer'

export function App() {
  return (
    <Routes>
      {/* The drawer is a child route so the list stays mounted (scroll, focus, filters) underneath it. */}
      <Route path="/" element={<ExplorerPage />}>
        <Route path="orders/:orderId" element={<OrderDrawer />} />
      </Route>
      <Route path="*" element={<ExplorerPage />} />
    </Routes>
  )
}
