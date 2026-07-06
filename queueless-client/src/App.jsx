
// import { BrowserRouter, Routes, Route } from 'react-router-dom'
// import JoinPage from './pages/JoinPage'
// import StatusPage from './pages/StatusPage'

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/join/:businessSlug" element={<JoinPage />} />
//         <Route path="/status/:entryId" element={<StatusPage />} />
//       </Routes>
//     </BrowserRouter>
//   )
// }

// export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import JoinPage from './pages/JoinPage'
import StatusPage from './pages/StatusPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:businessSlug" element={<JoinPage />} />
        <Route path="/status/:entryId" element={<StatusPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App