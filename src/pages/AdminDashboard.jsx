import { useEffect, useState } from 'react'
import ProductApproval from './ProductApproval'

export default function AdminDashboard({ admin, onLogout }) {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [page, setPage] = useState('vendors')
  const [menuOpen, setMenuOpen] = useState(false)
  const [banner, setBanner] = useState({ title: '', subtitle: '', buttonLabel: '', buttonUrl: '', active: true })
  const [bannerMessage, setBannerMessage] = useState('')

  useEffect(() => {
    fetch('http://localhost:3000/admin/marketplace-banner', { headers: { 'x-admin-token': admin.token } })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load marketplace banner')
        setBanner(data ? {
          title: data.title || '',
          subtitle: data.subtitle || '',
          buttonLabel: data.button_label || data.buttonLabel || '',
          buttonUrl: data.button_url || data.buttonUrl || '',
          active: data.active !== false,
        } : { title: '', subtitle: '', buttonLabel: '', buttonUrl: '', active: true })
      })
      .catch((loadError) => setError(loadError instanceof TypeError ? 'Unable to reach the vendor server.' : loadError.message))
  }, [admin.token])

  async function saveBanner(event) {
    event.preventDefault()
    setBannerMessage('')
    try {
      const response = await fetch('http://localhost:3000/admin/marketplace-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': admin.token },
        body: JSON.stringify(banner),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save marketplace banner')
      setBanner({
        title: data.title || '',
        subtitle: data.subtitle || '',
        buttonLabel: data.button_label || data.buttonLabel || '',
        buttonUrl: data.button_url || data.buttonUrl || '',
        active: data.active !== false,
      })
      setBannerMessage('Marketplace banner saved.')
    } catch (saveError) {
      setError(saveError instanceof TypeError ? 'Unable to reach the vendor server.' : saveError.message)
    }
  }

  async function loadUsers() {
    try {
      const response = await fetch('http://localhost:3000/users', {
        headers: { 'x-admin-token': admin.token },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load users')
      setUsers(data)
      setError('')
    } catch (loadError) {
      setError(loadError instanceof TypeError ? 'Unable to reach the vendor server.' : loadError.message)
    }
  }

  async function changeApproval(email, approved) {
    try {
      const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(email)}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': admin.token },
        body: JSON.stringify({ approved }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update approval')
      setUsers((currentUsers) => currentUsers.map((user) => user.email === email ? data.user : user))
    } catch (approvalError) {
      setError(approvalError instanceof TypeError ? 'Unable to reach the vendor server.' : approvalError.message)
    }
  }

  async function deleteVendor(email, shopName) {
    if (!window.confirm(`Delete ${shopName || 'this vendor'} and all of its products?`)) return

    try {
      const response = await fetch(`http://localhost:3000/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': admin.token },
        body: JSON.stringify({ shopName }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to delete vendor')
      setUsers((currentUsers) => currentUsers.filter((user) => user.email !== email))
    } catch (deleteError) {
      setError(deleteError instanceof TypeError ? 'Unable to reach the vendor server.' : deleteError.message)
    }
  }

  if (page === 'products') {
    return <ProductApproval admin={admin} onBack={() => setPage('vendors')} onSectionChange={setPage} />
  }

  return (
    <main className="dashboard-root admin-dashboard-root">
      <section className="dashboard-card">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h2>{page === 'banner' ? 'Marketplace banner' : 'Vendor approvals'}</h2>
            <p className="muted">Signed in as {admin.email}</p>
          </div>
          <div className="dashboard-actions">
            <button className="secondary" type="button" onClick={loadUsers}>Refresh vendors</button>
            <button className="secondary" type="button" onClick={onLogout}>Logout</button>
            <div className="admin-menu-wrap">
              <button className="admin-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open admin sections" aria-expanded={menuOpen}>...</button>
              {menuOpen && <nav className="admin-menu" aria-label="Admin sections">
                <button type="button" onClick={() => { setPage('vendors'); setMenuOpen(false) }}>Vendor approvals</button>
                <button type="button" onClick={() => { setPage('products'); setMenuOpen(false) }}>Product approvals</button>
                <button type="button" onClick={() => { setPage('banner'); setMenuOpen(false) }}>Banner settings</button>
              </nav>}
            </div>
          </div>
        </div>
        {error && <div className="error">{error}</div>}
        {page === 'banner' && <form className="admin-banner-form" onSubmit={saveBanner}>
          <div className="approval-heading">
            <div>
              <p className="eyebrow">Marketplace spotlight</p>
              <h2>Product banner</h2>
            </div>
            <label className="banner-toggle"><input type="checkbox" checked={banner.active} onChange={(event) => setBanner({ ...banner, active: event.target.checked })} /> Visible</label>
          </div>
          <div className="form-grid">
            <label className="label full-width"><span>Banner title</span><input value={banner.title} onChange={(event) => setBanner({ ...banner, title: event.target.value })} placeholder="Fresh finds, better prices" required /></label>
            <label className="label full-width"><span>Banner message</span><input value={banner.subtitle} onChange={(event) => setBanner({ ...banner, subtitle: event.target.value })} placeholder="Discover products from approved sellers" /></label>
            <label className="label"><span>Button text</span><input value={banner.buttonLabel} onChange={(event) => setBanner({ ...banner, buttonLabel: event.target.value })} placeholder="Shop now" /></label>
            <label className="label"><span>Button link</span><input value={banner.buttonUrl} onChange={(event) => setBanner({ ...banner, buttonUrl: event.target.value })} placeholder="/marketplace" /></label>
          </div>
          {bannerMessage && <div className="purchase-message">{bannerMessage}</div>}
          <button className="primary" type="submit">Save banner</button>
        </form>}
        {page === 'vendors' && <div className="approval-list">
          {users.map((user) => (
            <div className="approval-row" key={user.email}>
              <span>{user.shop_name || 'Shop name unavailable'}</span>
              <span className={user.approved ? 'approval-status approved' : 'approval-status'}>
                {user.approved ? 'Approved' : 'Not approved'}
              </span>
              <button className={user.approved ? 'secondary' : 'primary'} type="button" onClick={() => changeApproval(user.email, !user.approved)}>
                {user.approved ? 'Not approved' : 'Approve'}
              </button>
              <button className="secondary" type="button" onClick={() => deleteVendor(user.email, user.shop_name)}>
                Delete
              </button>
            </div>
          ))}
        </div>}
      </section>
    </main>
  )
}