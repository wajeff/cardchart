import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import CardPage from './components/CardPage/CardPage'
import Home from './components/Home/Home'


function App() {

  return (
     <Router>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path="/amex_cobalt" element={<CardPage card="amex_cobalt" />} />
        <Route path="/amex_platinum" element={<CardPage card="amex_platinum" />} />
      </Routes>
    </Router>
  )
}

export default App
