import { useState } from 'react'
import CategoryDrawer from './CategoryDrawer'

export default function Dashboard({ vendor, products, onLogout, onRegister, onProduct, onProducts, onEdit }) {
  const [purchaseProduct, setPurchaseProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [purchaseMessage, setPurchaseMessage] = useState('')

  function startPurchase(product) {
    setPurchaseProduct(product)
    setQuantity(1)
    setPurchaseMessage('')
  }

  function confirmPurchase(event) {
    event.preventDefault()

    if (quantity > Number(purchaseProduct.stock)) {
      setPurchaseMessage(`Only ${purchaseProduct.stock} item(s) are currently available.`)
      return
    }

    setPurchaseMessage(`Purchase request placed for ${quantity} ${purchaseProduct.productName} item(s).`)
  }

  return (
    <main className="dashboard-root">
      <CategoryDrawer onLogout={onLogout} />
      <div className="dashboard-card">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">Vendor Workspace</p>
            <h2>Welcome, {vendor?.shopName || 'Your shop'}</h2>
          </div>
          <span className="listing-count">{products.length} listing{products.length === 1 ? '' : 's'}</span>
        </div>
        {vendor ? (
          <div className="registration-success">
            <strong>{vendor.shopName}</strong>
            <span>Vendor registration complete</span>
          </div>
        ) : (
          <p className="muted">Register your shop to complete your vendor profile.</p>
        )}
        {products.length > 0 ? (
          <div className="product-list">
            {products.map((product, index) => (
              <article className="product-success" key={product.id || `${product.productName}-${index}`}>
                {product.imageUrls?.length > 0 ? (
                  <img
                    className="product-thumb"
                    src={product.imageUrls[0]}
                    alt={product.productName}
                  />
                ) : (
                  <div className="product-thumb product-thumb-empty">No image</div>
                )}
                <div className="product-details">
                  <strong>{product.productName}</strong>
                  <span className="product-status">{product.approved ? (product.status === 'active' ? 'Approved listing' : 'Inactive listing') : 'Waiting for admin approval'}</span>
                  <small>{product.description}</small>
                </div>
                <div className="product-meta">
                  <strong className="product-price">₹{Number(product.sellingPrice ?? product.price).toFixed(2)}</strong>
                  <span>{product.stock} in stock</span>
                </div>
                <div className="product-actions">
                  <button className="edit-button" type="button" onClick={() => onEdit(product)}>Edit</button>
                  <button
                    className="buy-button"
                    type="button"
                    disabled={!product.approved || product.status !== 'active' || Number(product.stock) === 0}
                    onClick={() => startPurchase(product)}
                  >
                    Buy now
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No products added yet.</p>
        )}
        <div className="dashboard-actions">
          <button className="secondary" type="button" onClick={onProducts}>
            View product list
          </button>
          <button className="primary" onClick={onRegister}>
            {vendor ? 'Update vendor details' : 'Register vendor'}
          </button>
          <button className="primary" onClick={onProduct}>
            Add another product
          </button>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
      {purchaseProduct && (
        <div className="purchase-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPurchaseProduct(null)
        }}>
          <form className="purchase-panel" onSubmit={confirmPurchase}>
            <p className="eyebrow">Quick purchase</p>
            <h2>Buy {purchaseProduct.productName}</h2>
            <p className="muted">₹{Number(purchaseProduct.sellingPrice ?? purchaseProduct.price).toFixed(2)} each · {purchaseProduct.stock} available</p>
            <label className="label">
              <span>Quantity</span>
              <input
                type="number"
                min="1"
                max={purchaseProduct.stock}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                required
              />
            </label>
            {purchaseMessage && <div className="purchase-message">{purchaseMessage}</div>}
            <div className="form-actions">
              <button className="secondary" type="button" onClick={() => setPurchaseProduct(null)}>Close</button>
              <button className="primary" type="submit">Confirm purchase</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}
