import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import StatusPage from './pages/StatusPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:businessSlug" element={<JoinPage />} />
        <Route path="/status/:entryId" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
