import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar/Navbar'
import CardPage from './components/CardPage/CardPage'
import Home from './components/Home/Home'
import Points from './components/Points/Points'

function App() {

  return (
     <Router>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>} />
        <Route path='/points' element={<Points/>} />
        <Route path="/amex_cobalt" element={<CardPage card="amex_cobalt" />} />
        <Route path="/amex_platinum" element={<CardPage card="amex_platinum" />} />
        <Route path="/amex_gold" element={<CardPage card="amex_gold" />} />
        <Route path="/td_first_class" element={<CardPage card="td_first_class" />} />
        <Route path="/scotia_visa_infinite_privilege" element={<CardPage card="scotia_visa_infinite_privilege" />} />
      </Routes>
    </Router>
  )
}

export default App
