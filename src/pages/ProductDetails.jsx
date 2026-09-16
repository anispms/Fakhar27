function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export default function ProductDetails({ product, loading, error, onBack, onBuy, suggestedProducts = [], onSelectProduct }) {
  if (loading) {
    return <main className="dashboard-root"><section className="dashboard-card product-detail-page"><p className="muted">Loading product details...</p></section></main>
  }

  if (error || !product) {
    return (
      <main className="dashboard-root">
        <section className="dashboard-card product-detail-page">
          <div className="error">{error || 'Product not found.'}</div>
          <button className="secondary" type="button" onClick={onBack}>Back to products</button>
        </section>
      </main>
    )
  }

  const similarProducts = suggestedProducts.filter((suggestedProduct) => {
    if (!suggestedProduct || suggestedProduct.id === product.id) return false

    const currentCategory = normalizeText(product.category)
    const currentSubcategory = normalizeText(product.subcategory)
    const suggestedCategory = normalizeText(suggestedProduct.category)
    const suggestedSubcategory = normalizeText(suggestedProduct.subcategory)
    const currentName = normalizeText(product.productName)
    const suggestedName = normalizeText(suggestedProduct.productName)

    if (currentCategory && currentCategory === suggestedCategory) return true
    if (currentSubcategory && currentSubcategory === suggestedSubcategory) return true
    if (currentCategory && suggestedCategory.includes(currentCategory)) return true
    if (currentSubcategory && suggestedSubcategory.includes(currentSubcategory)) return true

    const currentKeywords = currentName.split(' ').filter((word) => word.length > 2)
    if (currentKeywords.length === 0) return false

    return currentKeywords.some((keyword) => suggestedName.includes(keyword))
  }).slice(0, 6)

  const image = product.imageUrls?.[0]

  return (
    <main className="dashboard-root">
      <section className="dashboard-card product-detail-page">
        <button className="secondary product-detail-back" type="button" onClick={onBack}>Back to products</button>
        <div className="product-detail-layout">
          <div className="product-detail-image-wrap">
            {image ? <img className="product-detail-image" src={image} alt={product.productName} /> : <div className="product-detail-image product-thumb-empty">No image</div>}
          </div>
          <div className="product-detail-content">
            <p className="eyebrow">Product #{product.id}</p>
            <h2>{product.productName}</h2>
            <p className="product-detail-price">₹{Number(product.sellingPrice ?? product.price).toFixed(2)}</p>
            <span className="product-status">{product.status === 'active' ? 'Available' : 'Inactive'}</span>
            <p className="product-detail-description">{product.description}</p>
            <dl className="product-detail-specs">
              <div><dt>Stock</dt><dd>{product.stock} available</dd></div>
              <div><dt>HSN code</dt><dd>{product.hsnCode || 'Not provided'}</dd></div>
              <div><dt>Seller</dt><dd>{product.shopName || 'Shop name unavailable'}</dd></div>
            </dl>
            <button className="primary product-detail-buy" type="button" disabled={Number(product.stock) === 0 || product.status !== 'active'} onClick={() => onBuy(product)}>Buy now</button>
          </div>
        </div>

        {similarProducts.length > 0 && (
          <div className="similar-products-block" style={{ marginTop: '2rem' }}>
            <div className="product-detail-related-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Suggested products</h3>
            </div>
            <div className="product-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {similarProducts.map((suggestedProduct) => {
                const suggestedImage = suggestedProduct.imageUrls?.[0]
                return (
                  <article
                    key={suggestedProduct.id}
                    className="product-success product-card-tile"
                    onClick={() => onSelectProduct?.(suggestedProduct.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') onSelectProduct?.(suggestedProduct.id)
                    }}
                    role={onSelectProduct ? 'button' : undefined}
                    tabIndex={onSelectProduct ? 0 : undefined}
                    style={{ cursor: onSelectProduct ? 'pointer' : 'default' }}
                  >
                    {suggestedImage ? (
                      <img className="product-thumb" src={suggestedImage} alt={suggestedProduct.productName} />
                    ) : (
                      <div className="product-thumb product-thumb-empty">No image</div>
                    )}
                    <div className="product-details">
                      <strong>{suggestedProduct.productName}</strong>
                      <span className="product-status">{suggestedProduct.category || 'Product'}</span>
                    </div>
                    <div className="product-meta">
                      <strong className="product-price">₹{Number(suggestedProduct.sellingPrice ?? suggestedProduct.price).toFixed(2)}</strong>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
