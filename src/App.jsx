import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CardPage from './components/CardPage/CardPage'
import Home from './components/Home/Home'
function App() {
  const AmexCobalt = 'amexcobalt'
  return (
     <Router>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path="/amex" element={<CardPage card={AmexCobalt} />} />
      </Routes>
    </Router>
  )
}

export default App
