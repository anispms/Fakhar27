import { useEffect, useState } from 'react'
import CategoryDrawer, { marketplaceCategories } from './CategoryDrawer'
import { AUTH_API_URL } from '../apiConfig'

function getDiscountPercentage(product) {
  const price = Number(product.price)
  const sellingPrice = Number(product.sellingPrice ?? product.price)
  if (!Number.isFinite(price) || price <= 0 || sellingPrice >= price) return 0
  return Math.round(((price - sellingPrice) / price) * 100)
}

export default function ProductList({ products, loading, error, onRefresh, onBack, onEdit, onProduct, onSelectProduct, customer, customerMode = false }) {
  const [purchaseProduct, setPurchaseProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const [fullScreenImage, setFullScreenImage] = useState(null)
  const [searchType, setSearchType] = useState('product')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSubcategory, setSelectedSubcategory] = useState('All')
  const [cartItems, setCartItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountOpen, setIsAccountOpen] = useState(false)
  const [banner, setBanner] = useState(null)
  const [favoriteProductIds, setFavoriteProductIds] = useState([])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setFullScreenImage(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!customerMode) return
    fetch(`${AUTH_API_URL}/marketplace-banner`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setBanner(data))
      .catch(() => setBanner(null))
  }, [customerMode])

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

  function handleSearch(event) {
    event.preventDefault()
    setSearchQuery(searchInput.trim().toLowerCase())
  }

  function handleCategorySelect(category) {
    setSelectedCategory(category)
    setSelectedSubcategory('All')
  }

  function handleSubcategorySelect(category, subcategory) {
    setSelectedCategory(category)
    setSelectedSubcategory(subcategory)
  }

  function addToCart(product) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === product.id)
      if (existingItem) {
        return currentItems.map((item) => item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, Number(product.stock)) }
          : item)
      }
      return [...currentItems, { ...product, quantity: 1 }]
    })
    setIsCartOpen(true)
  }

  function updateCartQuantity(productId, quantityValue) {
    setCartItems((currentItems) => currentItems
      .map((item) => item.id === productId ? { ...item, quantity: quantityValue } : item)
      .filter((item) => item.quantity > 0))
  }

  function toggleFavorite(productId) {
    setFavoriteProductIds((currentIds) => currentIds.includes(productId)
      ? currentIds.filter((id) => id !== productId)
      : [...currentIds, productId])
  }

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cartItems.reduce((total, item) => total + Number(item.sellingPrice ?? item.price) * item.quantity, 0)

  const categoryProducts = customerMode && selectedCategory !== 'All'
    ? products.filter((product) => String(product.category || '').toLowerCase() === selectedCategory.toLowerCase())
    : products

  const selectedCategoryData = marketplaceCategories.find((category) => category.name === selectedCategory)
  const availableSubcategories = selectedCategoryData
    ? selectedCategoryData.subcategories
    : [...new Set(marketplaceCategories.flatMap((category) => category.subcategories))].sort()
  const subcategoryProducts = customerMode && selectedSubcategory !== 'All'
    ? categoryProducts.filter((product) => String(product.subcategory || '').toLowerCase() === selectedSubcategory.toLowerCase())
    : categoryProducts

  const visibleProducts = customerMode && searchQuery
    ? subcategoryProducts.filter((product) => {
      if (searchType === 'shop') {
        return String(product.shopName || product.shop_name || '').trim().toLowerCase().includes(searchQuery)
      }

      if (searchType === 'subcategory') {
        return String(product.subcategory || product.sub_category || '').trim().toLowerCase().includes(searchQuery)
      }

      const productName = String(product.productName || product.product_name || '').trim().toLowerCase()
      const subcategory = String(product.subcategory || product.sub_category || '').trim().toLowerCase()
      return productName.includes(searchQuery) || subcategory.includes(searchQuery)
    })
    : subcategoryProducts

  return (
    <main className={`dashboard-root ${customerMode ? 'marketplace-root' : ''}`}>
      <CategoryDrawer
        onLogout={onBack}
        selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          onSubcategorySelect={handleSubcategorySelect}
      />
      <section className="dashboard-card product-list-page">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">{customerMode ? 'Marketplace' : 'Vendor catalogue'}</p>
            <h2>{customerMode ? 'Sab Kuch Bechoo' : 'My product listings'}</h2>
            <p className="muted">{customerMode ? 'Find everything in one place.' : 'Products below are loaded from the product API.'}</p>
          </div>
          <div className="marketplace-heading-actions">
            <span className="listing-count">{visibleProducts.length} listing{visibleProducts.length === 1 ? '' : 's'}</span>
            {customerMode && <button className="cart-button" type="button" onClick={() => setIsCartOpen(true)} aria-label={`Open cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
              <span aria-hidden="true">🛒</span> Cart <b>{cartCount}</b>
            </button>}
            {customerMode && <button className="account-button" type="button" onClick={() => setIsAccountOpen(true)} aria-label="Open My Account">
              <span aria-hidden="true">👤</span> My Account
            </button>}
          </div>
        </div>

        {customerMode && (
          <form className="marketplace-search" onSubmit={handleSearch}>
            <label className="search-select-label">
              <span className="sr-only">Search by</span>
              <select value={searchType} onChange={(event) => setSearchType(event.target.value)} aria-label="Search by">
                <option value="product">Product</option>
                <option value="subcategory">Subcategory</option>
                <option value="shop">Shop name</option>
              </select>
            </label>
            <label className="search-input-label">
              <span className="sr-only">Search marketplace</span>
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={searchType === 'shop' ? 'Search by shop name' : searchType === 'subcategory' ? 'Search by subcategory' : 'Search by product or subcategory'} />
            </label>
            <button className="primary search-button" type="submit">Search</button>
          </form>
        )}

        {customerMode && banner && (
          <section className="marketplace-banner">
            <div>
              <p className="eyebrow">Featured today</p>
              <h2>{banner.title}</h2>
              {banner.subtitle && <p>{banner.subtitle}</p>}
            </div>
            {banner.buttonLabel && banner.buttonUrl && <a className="primary banner-action" href={banner.buttonUrl}>{banner.buttonLabel}</a>}
          </section>
        )}

        {customerMode && (
          <div className="marketplace-categories" aria-label="Main product categories">
            <button className={`category-chip ${selectedCategory === 'All' ? 'is-selected' : ''}`} type="button" onClick={() => setSelectedCategory('All')}>
              <strong>All products</strong>
              <span>Browse everything</span>
            </button>
            {marketplaceCategories.map((category) => (
              <button className={`category-chip ${selectedCategory === category.name ? 'is-selected' : ''}`} type="button" key={category.name} onClick={() => handleCategorySelect(category.name)}>
                <strong>{category.name}</strong>
                <span>{category.subcategories.join(' · ')}</span>
              </button>
            ))}
          </div>
        )}

        {customerMode && (
          <label className="subcategory-filter">
            <span>Browse by subcategory</span>
            <select value={selectedSubcategory} onChange={(event) => setSelectedSubcategory(event.target.value)}>
              <option value="All">All subcategories</option>
              {availableSubcategories.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
            </select>
          </label>
        )}

        <div className="list-toolbar">
          {!customerMode && <button className="secondary" type="button" onClick={onBack}>Back to dashboard</button>}
          <button className="secondary" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh products'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {loading ? (
          <p className="muted">Loading your products...</p>
        ) : visibleProducts.length > 0 ? (
          <div className="product-list">
            {visibleProducts.map((product, index) => (
              <article
                className="product-success product-card-tile"
                key={product.id || `${product.productName}-${index}`}
                onClick={() => onSelectProduct?.(product.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectProduct?.(product.id)
                }}
                role={onSelectProduct ? 'button' : undefined}
                tabIndex={onSelectProduct ? 0 : undefined}
              >
                {customerMode && <button
                  className={`mobile-favorite-button ${favoriteProductIds.includes(product.id) ? 'is-favorite' : ''}`}
                  type="button"
                  onClick={(event) => { event.stopPropagation(); toggleFavorite(product.id) }}
                  aria-label={`${favoriteProductIds.includes(product.id) ? 'Remove' : 'Add'} ${product.productName} ${favoriteProductIds.includes(product.id) ? 'from' : 'to'} favorites`}
                  aria-pressed={favoriteProductIds.includes(product.id)}
                >
                  <span aria-hidden="true">{favoriteProductIds.includes(product.id) ? '♥' : '♡'}</span>
                </button>}
                {product.imageUrls?.length > 0 ? (
                  <button className="product-image-button" type="button" onClick={(event) => { event.stopPropagation(); setFullScreenImage({ src: product.imageUrls[0], alt: product.productName }) }} aria-label={`View ${product.productName} image fullscreen`}>
                    <img className="product-thumb" src={product.imageUrls[0]} alt={product.productName} />
                  </button>
                ) : (
                  <div className="product-thumb product-thumb-empty">No image</div>
                )}
                <div className="product-details">
                  <strong>{product.productName}</strong>
                  {customerMode && <span className="product-shop-name">{product.shopName || 'Shop name unavailable'}</span>}
                  <span className="product-status">{product.approved ? (product.status === 'active' ? 'Approved listing' : 'Inactive listing') : 'Waiting for admin approval'}</span>
                  <small>{product.description}</small>
                </div>
                <div className="product-meta">
                  {getDiscountPercentage(product) > 0 ? (
                    <div className="product-price-group">
                      <span className="product-original-price">₹{Number(product.price).toFixed(2)}</span>
                      <strong className="product-price">₹{Number(product.sellingPrice).toFixed(2)}</strong>
                      <span className="product-discount">{getDiscountPercentage(product)}% off</span>
                    </div>
                  ) : (
                    <strong className="product-price">₹{Number(product.sellingPrice ?? product.price).toFixed(2)}</strong>
                  )}
                  <span>{product.stock} in stock</span>
                </div>
                <div className="product-actions">
                  {!customerMode && <button className="edit-button" type="button" onClick={(event) => { event.stopPropagation(); onEdit(product) }}>Edit</button>}
                  <button
                    className="buy-button"
                    type="button"
                    disabled={!product.approved || product.status !== 'active' || Number(product.stock) === 0}
                    onClick={(event) => { event.stopPropagation(); startPurchase(product) }}
                  >
                    Buy now
                  </button>
                  {customerMode && <button
                    className="cart-add-button"
                    type="button"
                    disabled={!product.approved || product.status !== 'active' || Number(product.stock) === 0}
                    onClick={(event) => { event.stopPropagation(); addToCart(product) }}
                  >
                    <span aria-hidden="true">🛍</span> Add to cart
                  </button>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-list">
            <p className="muted">{customerMode ? (searchQuery ? 'No products match your search.' : 'No approved products are available yet.') : 'No products found for this vendor.'}</p>
            {!customerMode && <button className="primary" type="button" onClick={onProduct}>Add your first product</button>}
          </div>
        )}

        {!customerMode && <div className="dashboard-actions">
          <button className="primary" type="button" onClick={onProduct}>Add another product</button>
        </div>}
      </section>

      {customerMode && (
        <footer className="marketplace-footer">
          <div className="marketplace-footer-brand">
            <p className="eyebrow">Marketplace</p>
            <h2>Find something useful.</h2>
            <p>Shop approved products from trusted marketplace vendors.</p>
          </div>
          <div className="marketplace-footer-links">
            <strong>Shop categories</strong>
            <div>
              <button type="button" onClick={() => setSelectedCategory('All')}>All products</button>
              {marketplaceCategories.map((category) => (
                <button type="button" key={category.name} onClick={() => setSelectedCategory(category.name)}>{category.name}</button>
              ))}
            </div>
          </div>
          <div className="marketplace-footer-support">
            <strong>Need help?</strong>
            <p>Browse a category or use search to find your next product.</p>
          </div>
          <div className="marketplace-footer-bottom">
            <span>© 2026 Marketplace</span>
            <span>Secure shopping from approved sellers</span>
          </div>
        </footer>
      )}

      {customerMode && isCartOpen && (
        <div className="cart-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsCartOpen(false)
        }}>
          <aside className="cart-panel" aria-label="Shopping cart">
            <div className="cart-panel-heading">
              <div>
                <p className="eyebrow">Marketplace</p>
                <h2>Your cart</h2>
              </div>
              <button className="image-viewer-close cart-close" type="button" onClick={() => setIsCartOpen(false)} aria-label="Close cart">×</button>
            </div>
            {cartItems.length === 0 ? <p className="muted">Your cart is empty.</p> : (
              <>
                <div className="cart-items">
                  {cartItems.map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <strong>{item.productName}</strong>
                        <span>₹{Number(item.sellingPrice ?? item.price).toFixed(2)} each</span>
                      </div>
                      <div className="cart-item-controls">
                        <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity - 1)} aria-label={`Remove one ${item.productName}`}>−</button>
                        <span>{item.quantity}</span>
                        <button type="button" disabled={item.quantity >= Number(item.stock)} onClick={() => updateCartQuantity(item.id, item.quantity + 1)} aria-label={`Add one ${item.productName}`}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-total"><span>Total</span><strong>₹{cartTotal.toFixed(2)}</strong></div>
                <button className="primary cart-checkout" type="button">Proceed to checkout</button>
              </>
            )}
          </aside>
        </div>
      )}

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
              <input type="number" min="1" max={purchaseProduct.stock} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
            </label>
            {purchaseMessage && <div className="purchase-message">{purchaseMessage}</div>}
            <div className="form-actions">
              <button className="secondary" type="button" onClick={() => setPurchaseProduct(null)}>Close</button>
              <button className="primary" type="submit">Confirm purchase</button>
            </div>
          </form>
        </div>
      )}

      {fullScreenImage && (
        <div className="image-viewer-overlay" role="dialog" aria-modal="true" aria-label={`${fullScreenImage.alt} fullscreen image`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFullScreenImage(null)
        }}>
          <button className="image-viewer-close" type="button" onClick={() => setFullScreenImage(null)} aria-label="Close fullscreen image">×</button>
          <img className="image-viewer" src={fullScreenImage.src} alt={fullScreenImage.alt} />
        </div>
      )}

      {customerMode && isAccountOpen && (
        <div className="account-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsAccountOpen(false)
        }}>
          <aside className="account-panel" aria-label="My Account">
            <div className="account-panel-heading">
              <div>
                <p className="eyebrow">Customer Dashboard</p>
                <h2>My Account</h2>
              </div>
              <button className="category-drawer-close" type="button" onClick={() => setIsAccountOpen(false)} aria-label="Close My Account">×</button>
            </div>
            <div className="account-profile">
              <strong>{customer?.name || customer?.fullName || 'Customer'}</strong>
              <span>{customer?.email || 'Profile details'}</span>
            </div>
            <nav className="account-menu" aria-label="Account options">
              <button type="button">Profile</button>
              <button type="button">My orders</button>
              <button type="button">Favorites</button>
              <button type="button">Saved address</button>
              <button type="button">Settings</button>
            </nav>
            <button className="drawer-logout" type="button" onClick={onBack}>Log out</button>
          </aside>
        </div>
      )}
    </main>
  )
}
