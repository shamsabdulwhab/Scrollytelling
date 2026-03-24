import { Route, Routes } from 'react-router-dom'
import { AppFlowProvider } from './app/AppFlowProvider'
import { AppShellLayout } from './layouts/AppShellLayout'
import './App.css'

function App() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <AppFlowProvider>
            <AppShellLayout />
          </AppFlowProvider>
        }
      />
    </Routes>
  )
}

export default App
