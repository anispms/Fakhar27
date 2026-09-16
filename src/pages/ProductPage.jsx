import { useState } from 'react'
import { marketplaceCategories } from './CategoryDrawer'

const initialProduct = {
  productName: '',
  category: '',
  subcategory: '',
  price: '',
  sellingPrice: '',
  description: '',
  stock: '',
  status: 'active',
  hsnCode: '',
  images: [],
  videos: [],
}

export default function ProductPage({ product, approved, onCancel, onSave }) {
  const [form, setForm] = useState(() => ({
    ...initialProduct,
    ...(product || {}),
    images: Array.isArray(product?.images) ? product.images : [],
    videos: Array.isArray(product?.videos) ? product.videos : [],
  }))
  const [error, setError] = useState('')
  const selectedCategory = marketplaceCategories.find((category) => category.name === form.category)

  function handleCategoryChange(event) {
    const category = event.target.value
    setForm((currentForm) => ({ ...currentForm, category, subcategory: '' }))
  }

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleFiles(event) {
    const { name, files } = event.target
    setForm((currentForm) => ({
      ...currentForm,
      [name]: Array.from(files),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!approved) {
      setError('Your account is not approved. You cannot add or update products.')
      return
    }

    if (Number(form.price) < 0 || Number(form.sellingPrice) < 0 || Number(form.stock) < 0) {
      setError('Prices and stock cannot be negative.')
      return
    }

    setError('')
    onSave(form)
  }

  return (
    <main className="product-root">
      <form className="product-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">Product catalogue</p>
            <h2>{product ? 'Update product' : 'Add a product'}</h2>
            <p className="muted">{product ? 'Updates return to the admin approval queue.' : 'Submit a clear listing for admin approval.'}</p>
          </div>
          <span className="form-step">PRODUCT</span>
        </div>

        {!approved && <div className="error">Your account is not approved. You cannot add or update products.</div>}

        {error && <div className="error">{error}</div>}

        <div className="form-grid">
          <label className="label full-width">
            <span>Product name</span>
            <input name="productName" value={form.productName} onChange={handleChange} placeholder="Enter product name" required />
          </label>

          <label className="label">
            <span>Main category</span>
            <select name="category" value={form.category} onChange={handleCategoryChange} required>
              <option value="">Choose a category</option>
              <option>Fashion</option>
              <option>Food</option>
              <option>Grocery</option>
              <option>Electronics</option>
              <option>Home</option>
              <option>Beauty</option>
              <option>Sports</option>
            </select>
          </label>

          <label className="label">
            <span>Sub category</span>
            <select name="subcategory" value={form.subcategory} onChange={handleChange} required disabled={!selectedCategory}>
              <option value="">{selectedCategory ? 'Choose a sub category' : 'Choose a category first'}</option>
              {selectedCategory?.subcategories.map((subcategory) => <option key={subcategory}>{subcategory}</option>)}
            </select>
          </label>

          <label className="label">
            <span>Price</span>
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="0.00" required />
          </label>

          <label className="label">
            <span>Selling price</span>
            <input name="sellingPrice" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={handleChange} placeholder="0.00" required />
          </label>

          <label className="label">
            <span>No. of stock</span>
            <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} placeholder="Available quantity" required />
          </label>

          <label className="label">
            <span>Product status</span>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="label">
            <span>HSN code</span>
            <input name="hsnCode" value={form.hsnCode} onChange={handleChange} placeholder="Enter HSN code" required />
          </label>

          <label className="label full-width">
            <span>Description</span>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the product, its features and specifications" rows="4" required />
          </label>

          <label className="label media-field">
            <span>Images</span>
            <input name="images" type="file" accept="image/*" multiple onChange={handleFiles} />
            <small>{form.images.length ? `${form.images.length} image(s) selected` : 'PNG, JPG or WEBP'}</small>
          </label>

          <label className="label media-field">
            <span>Videos</span>
            <input name="videos" type="file" accept="video/*" multiple onChange={handleFiles} />
            <small>{form.videos.length ? `${form.videos.length} video(s) selected` : 'MP4, MOV or WEBM'}</small>
          </label>
        </div>

        <div className="form-actions">
          <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary" type="submit" disabled={!approved}>{product ? 'Submit update for approval' : 'Submit for approval'}</button>
        </div>
      </form>
    </main>
  )
}