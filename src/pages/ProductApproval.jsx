import { useEffect, useState } from 'react'
import { AUTH_API_URL, PRODUCT_API_URL } from '../apiConfig'

function getMediaUrl(value) {
  if (typeof value !== 'string' || !value) return ''
  return value.startsWith('/') ? `${PRODUCT_API_URL}${value}` : value
}

export default function ProductApproval({ admin, onBack, onSectionChange }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [section, setSection] = useState('pending')
  const [selectedProduct, setSelectedProduct] = useState(null)

  async function loadProducts() {
    setLoading(true)
    try {
      const response = await fetch(`${AUTH_API_URL}/admin/products`, {
        headers: { 'x-admin-token': admin.token },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load products')
      setProducts(Array.isArray(data) ? data : [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof TypeError ? 'Unable to reach the vendor server.' : loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch(`${AUTH_API_URL}/admin/products`, {
      headers: { 'x-admin-token': admin.token },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load products')
        setProducts(data)
        setError('')
      })
      .catch((loadError) => setError(loadError instanceof TypeError ? 'Unable to reach the vendor server.' : loadError.message))
      .finally(() => setLoading(false))
  }, [admin.token])

  async function changeProductApproval(id, approved) {
    try {
      const response = await fetch(`${AUTH_API_URL}/admin/products/${id}/approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': admin.token },
        body: JSON.stringify({ approved }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update product approval')
      setProducts((currentProducts) => currentProducts.map((product) => product.id === id ? { ...product, ...data.product } : product))
      setSelectedProduct((currentProduct) => currentProduct?.id === id ? { ...currentProduct, ...data.product } : currentProduct)
    } catch (approvalError) {
      setError(approvalError instanceof TypeError ? 'Unable to reach the vendor server.' : approvalError.message)
    }
  }

  const visibleProducts = products.filter((product) => section === 'pending' ? !product.approved : product.approved)

  function renderMedia(value, type, index) {
    const url = getMediaUrl(value)
    if (type === 'image' && url) return <img key={`${url}-${index}`} src={url} alt={`${selectedProduct.product_name} image ${index + 1}`} />
    if (type === 'video' && url && /^(data:video|https?:|blob:)/.test(url)) return <video key={`${url}-${index}`} src={url} controls />
    return <span className="review-media-name" key={`${value}-${index}`}>{String(value || 'Media unavailable')}</span>
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.product_name || 'this product'} permanently?`)) return

    try {
      const response = await fetch(`${AUTH_API_URL}/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': admin.token },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to delete product')
      setProducts((currentProducts) => currentProducts.filter((currentProduct) => currentProduct.id !== product.id))
    } catch (deleteError) {
      setError(deleteError instanceof TypeError ? 'Unable to reach the vendor server.' : deleteError.message)
    }
  }

  return (
    <main className="dashboard-root admin-dashboard-root">
      <section className="dashboard-card">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h2>Product approval</h2>
            <p className="muted">Review vendor submissions before they become visible to buyers.</p>
          </div>
          <div className="dashboard-actions">
            <button className="secondary" type="button" onClick={loadProducts} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh products'}
            </button>
            <button className="secondary" type="button" onClick={onBack}>Back to dashboard</button>
            <div className="admin-menu-wrap">
              <button className="admin-menu-button" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open admin sections" aria-expanded={menuOpen}>...</button>
              {menuOpen && <nav className="admin-menu" aria-label="Admin sections">
                <button type="button" onClick={() => onSectionChange?.('vendors')}>Vendor approvals</button>
                <button type="button" onClick={() => onSectionChange?.('products')}>Product approvals</button>
                <button type="button" onClick={() => onSectionChange?.('banner')}>Banner settings</button>
              </nav>}
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="approval-tabs" role="tablist" aria-label="Product approval sections">
          <button className={section === 'pending' ? 'is-selected' : ''} type="button" onClick={() => setSection('pending')}>Pending approvals ({products.filter((product) => !product.approved).length})</button>
          <button className={section === 'approved' ? 'is-selected' : ''} type="button" onClick={() => setSection('approved')}>Approved products ({products.filter((product) => product.approved).length})</button>
        </div>

        {loading ? (
          <p className="muted">Loading product submissions...</p>
        ) : visibleProducts.length > 0 ? (
          <div className="approval-list">
            {visibleProducts.map((product) => (
              <div className="approval-row approval-row-clickable" key={product.id} onClick={() => setSelectedProduct(product)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedProduct(product) }} role="button" tabIndex={0}>
                <span>
                  <strong>{product.product_name}</strong><br />
                  <small>{product.shop_name || 'Shop name unavailable'}</small>
                </span>
                <span className={product.approved ? 'approval-status approved' : 'approval-status'}>
                  {product.approved ? 'Approved' : 'Not approved'}
                </span>
                {section === 'pending' && <button
                  className="primary"
                  type="button"
                  onClick={(event) => { event.stopPropagation(); changeProductApproval(product.id, true) }}
                >Approve</button>}
                {section === 'approved' && <button
                  className="secondary"
                  type="button"
                  onClick={(event) => { event.stopPropagation(); changeProductApproval(product.id, false) }}
                >Move to pending</button>}
                <button className="danger-button" type="button" onClick={(event) => { event.stopPropagation(); deleteProduct(product) }}>Delete</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No {section === 'pending' ? 'pending product submissions' : 'approved products'} found.</p>
        )}
      </section>

      {selectedProduct && (
        <div className="product-review-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedProduct(null)
        }}>
          <section className="product-review-panel" aria-label="Product review">
            <div className="product-review-heading">
              <div>
                <p className="eyebrow">Product review</p>
                <h2>{selectedProduct.product_name}</h2>
                <p className="muted">{selectedProduct.shop_name || 'Shop name unavailable'}</p>
              </div>
              <button className="category-drawer-close" type="button" onClick={() => setSelectedProduct(null)} aria-label="Close product review">×</button>
            </div>
            <div className="product-review-content">
              <div>
                <h3>Description</h3>
                <p className="product-review-description">{selectedProduct.description || 'No description provided.'}</p>
                <dl className="product-review-specs">
                  <div><dt>Category</dt><dd>{selectedProduct.category || 'Not provided'}{selectedProduct.subcategory ? ` / ${selectedProduct.subcategory}` : ''}</dd></div>
                  <div><dt>Price</dt><dd>₹{Number(selectedProduct.selling_price ?? selectedProduct.price).toFixed(2)}</dd></div>
                  <div><dt>Stock</dt><dd>{selectedProduct.stock}</dd></div>
                  <div><dt>Status</dt><dd>{selectedProduct.status || 'Not provided'}</dd></div>
                </dl>
              </div>
              <div>
                <h3>Images</h3>
                <div className="product-review-images">
                  {Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0
                    ? selectedProduct.images.map((image, index) => renderMedia(image, 'image', index))
                    : <span className="muted">No images provided.</span>}
                </div>
                <h3>Videos</h3>
                <div className="product-review-videos">
                  {Array.isArray(selectedProduct.videos) && selectedProduct.videos.length > 0
                    ? selectedProduct.videos.map((video, index) => renderMedia(video, 'video', index))
                    : <span className="muted">No videos provided.</span>}
                </div>
              </div>
            </div>
            {!selectedProduct.approved && <button className="primary" type="button" onClick={() => changeProductApproval(selectedProduct.id, true)}>Approve product</button>}
          </section>
        </div>
      )}
    </main>
  )
}
