import { Outlet } from 'react-router-dom'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'var(--bottom-nav-height)' }}>
      <TopHeader />
      <main style={{
        paddingTop: 'var(--header-height)',
        maxWidth: 'var(--max-content-width)',
        margin: '0 auto',
        minHeight: 'calc(100vh - var(--header-height))'
      }}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
