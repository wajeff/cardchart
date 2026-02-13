import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import CardPage from './components/CardPage/CardPage'
import Home from './components/Home/Home'


function App() {

  return (
     <Router>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path="/amex" element={<CardPage card="amex_cobalt" />} />
      </Routes>
    </Router>
  )
}

export default App
