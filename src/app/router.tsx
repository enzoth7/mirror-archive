import { Route, Routes } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import Layout from './layout'
import Home from '../pages/Home'
import NewLook from '../pages/NewLook'
import LookDetail from '../pages/LookDetail'
import Login from '../pages/Login'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/new" element={<NewLook />} />
          <Route path="/look/:id" element={<LookDetail />} />
        </Route>
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}
