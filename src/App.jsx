import { useState } from 'react'
import './App.css'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductPage from './pages/ProductPage'
import ProductList from './pages/ProductList'
import VendorRegistration from './pages/VendorRegistration'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import Landing from './pages/Landing'
import VendorAccess from './pages/VendorAccess'
import CustomerAccess from './pages/CustomerAccess'
import CustomerRegistration from './pages/CustomerRegistration'
import ProductDetails from './pages/ProductDetails'
import { AUTH_API_URL, PRODUCT_API_URL } from './apiConfig'

function getCachedProductImages(productId) {
  if (!productId || typeof window === 'undefined') return []

  try {
    const cachedImages = JSON.parse(window.localStorage.getItem(`product-images-${productId}`) || '[]')
    return Array.isArray(cachedImages) ? cachedImages : []
  } catch {
    return []
  }
}

function cacheProductImages(productId, images) {
  if (!productId || typeof window === 'undefined' || images.length === 0) return

  try {
    window.localStorage.setItem(`product-images-${productId}`, JSON.stringify(images))
  } catch {}
}

function toUiProduct(product) {
  const images = Array.isArray(product.images) ? product.images : []
  const persistedImageUrls = images
    .filter((image) => typeof image === 'string' && /^(data:|https?:|blob:|\/product-images\/)/.test(image))
    .map((image) => image.startsWith('/') ? `${PRODUCT_API_URL}${image}` : image)
  const cachedImageUrls = getCachedProductImages(product.id)
  const responseImageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.filter((image) => typeof image === 'string')
    : []
  const imageUrls = responseImageUrls.length > 0
    ? responseImageUrls.map((image) => image.startsWith('/') ? `${PRODUCT_API_URL}${image}` : image)
    : persistedImageUrls.length > 0 ? persistedImageUrls : cachedImageUrls

  return {
    id: product.id,
    userEmail: product.user_email || product.userEmail,
    shopName: product.shop_name || product.shopName || '',
    productName: product.product_name || product.productName,
    category: product.category || product.product_type || product.productType || '',
    subcategory: product.subcategory || product.sub_category || '',
    price: product.price,
    sellingPrice: product.selling_price ?? product.sellingPrice ?? product.price,
    description: product.description,
    stock: product.stock,
    status: product.status,
    approved: product.approved === true,
    hsnCode: product.hsn_code || product.hsnCode,
    images,
    videos: Array.isArray(product.videos) ? product.videos : [],
    imageUrls,
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [customerProducts, setCustomerProducts] = useState([])
  const [customerProductsLoading, setCustomerProductsLoading] = useState(false)
  const [customerProductsError, setCustomerProductsError] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productDetailsLoading, setProductDetailsLoading] = useState(false)
  const [productDetailsError, setProductDetailsError] = useState('')
  const [editingProduct, setEditingProduct] = useState(null)
  const [view, setView] = useState('landing')
  const [loginMode, setLoginMode] = useState('vendor')
  const [admin, setAdmin] = useState(null)

  const isAdminPath = window.location.pathname === '/admin'

  async function loadProducts(email) {
    setProductsLoading(true)
    setProductsError('')

    try {
      const response = await fetch(`${PRODUCT_API_URL}/products/${encodeURIComponent(email)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load products')
      }

      const productsData = Array.isArray(data) ? data : []
      setProducts((currentProducts) => productsData.map((product) => {
        const refreshedProduct = toUiProduct(product)
        const previousProduct = currentProducts.find((currentProduct) => currentProduct.id === refreshedProduct.id)
        return refreshedProduct.imageUrls.length > 0 || !previousProduct?.imageUrls?.length
          ? refreshedProduct
          : { ...refreshedProduct, imageUrls: previousProduct.imageUrls }
      }))
    } catch (error) {
      setProductsError(error instanceof TypeError ? 'Unable to reach the product server.' : error.message)
      throw error
    } finally {
      setProductsLoading(false)
    }
  }

  async function loadCustomerProducts() {
    setCustomerProductsLoading(true)
    setCustomerProductsError('')

    try {
      const response = await fetch(`${PRODUCT_API_URL}/approved-products`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load approved products')
      }

      const productsData = Array.isArray(data) ? data : []
      setCustomerProducts((currentProducts) => productsData.map((product) => {
        const refreshedProduct = toUiProduct(product)
        const previousProduct = currentProducts.find((currentProduct) => currentProduct.id === refreshedProduct.id)
        return refreshedProduct.imageUrls.length > 0 || !previousProduct?.imageUrls?.length
          ? refreshedProduct
          : { ...refreshedProduct, imageUrls: previousProduct.imageUrls }
      }))
    } catch (error) {
      setCustomerProductsError(error instanceof TypeError ? 'Unable to reach the product server.' : error.message)
      throw error
    } finally {
      setCustomerProductsLoading(false)
    }
  }

  async function openProductDetails(productId) {
    setSelectedProduct(null)
    setProductDetailsLoading(true)
    setProductDetailsError('')
    setView('product-details')

    try {
      const response = await fetch(`${PRODUCT_API_URL}/products/id/${encodeURIComponent(productId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load product details')
      setSelectedProduct(toUiProduct(data))
    } catch (error) {
      setProductDetailsError(error instanceof TypeError ? 'Unable to reach the product server.' : error.message)
    } finally {
      setProductDetailsLoading(false)
    }
  }

  async function handleLogin(credentials, requestedMode = loginMode) {
    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'User is not registered')
        return
      }

      setUser(data.user)
      if (requestedMode === 'customer') {
        await loadCustomerProducts()
        setView('customer-products')
      } else {
        await loadProducts(data.user.email)
        setView('dashboard')
      }
    } catch (error) {
      alert(error instanceof TypeError ? 'Unable to reach a server. Start both vendor and product servers.' : error.message)
    }
  }

  async function handleAdminLogin(credentials) {
    try {
      const response = await fetch(`${AUTH_API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Invalid admin credentials')
      setAdmin({ ...data.admin, token: data.token })
    } catch (error) {
      alert(error instanceof TypeError ? 'Unable to reach the vendor server.' : error.message)
    }
  }

  function handleLogout() {
    setUser(null)
    setVendor(null)
    setLoginMode('vendor')
    setView('landing')
  }

  function handleAdminLogout() {
    setAdmin(null)
  }

  async function handleRegistration(registration) {
    try {
      const response = await fetch(`${AUTH_API_URL}/postData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registration.email,
          password: registration.password,
          shopName: registration.shopName,
          shopAddress: registration.shopAddress,
          mobileNumber: registration.mobileNumber,
          productType: registration.productType,
          hsnCode: registration.hsnCode,
          gstNumber: registration.gstNumber,
          registrationYear: registration.registrationYear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setVendor(registration)
      setLoginMode('vendor')
      setView('vendor-login')
    } catch (error) {
      alert(error instanceof TypeError ? 'Unable to reach the vendor server. Start it with: npm run server:vendor' : error.message)
    }
  }

  async function handleCustomerRegistration(registration) {
    try {
      const response = await fetch(`${AUTH_API_URL}/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registration),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setLoginMode('customer')
      setView('customer-login')
      alert('Customer registration successful. Please log in.')
    } catch (error) {
      alert(error instanceof TypeError ? 'Unable to reach the server.' : error.message)
    }
  }

  async function handleProductSave(product) {
    if (!product || typeof product !== 'object') {
      alert('Product data is missing. Please complete the product form and try again.')
      return
    }

    const editing = Boolean(product.id)
    const productImages = Array.isArray(product.images) ? product.images : []
    const productVideos = Array.isArray(product.videos) ? product.videos : []

    try {
      const formData = new FormData()
      formData.append('userEmail', user.email)
      formData.append('productName', product.productName)
      formData.append('category', product.category)
      formData.append('subcategory', product.subcategory)
      formData.append('price', product.price)
      formData.append('sellingPrice', product.sellingPrice)
      formData.append('description', product.description)
      formData.append('stock', product.stock)
      formData.append('status', product.status)
      formData.append('hsnCode', product.hsnCode)
      const existingImages = []
      productImages.forEach((file) => {
        if (typeof file === 'string') existingImages.push(file)
        else if (file instanceof File) formData.append('images', file)
      })
      const videoNames = []
      productVideos.forEach((file) => {
        if (typeof file === 'string') videoNames.push(file)
        else if (file instanceof File) videoNames.push(file.name)
      })
      formData.append('existingImages', JSON.stringify(existingImages))
      formData.append('videos', JSON.stringify(videoNames))

      const response = await fetch(
        editing ? `${PRODUCT_API_URL}/products/${product.id}` : `${PRODUCT_API_URL}/postProduct`,
        {
        method: editing ? 'PUT' : 'POST',
        body: formData,
        },
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Product could not be saved')
      }

      const savedProduct = toUiProduct(data.product)

      setProducts((currentProducts) => {
        const safeProducts = Array.isArray(currentProducts) ? currentProducts : []
        return editing
          ? safeProducts.map((currentProduct) => currentProduct.id === savedProduct.id ? savedProduct : currentProduct)
          : [savedProduct, ...safeProducts]
      })
      setEditingProduct(null)
      setView('products')
    } catch (error) {
      alert(error.message)
    }
  }

  function handleEditProduct(product) {
    setEditingProduct(product)
    setView('product')
  }

  if (isAdminPath) {
    return admin
      ? <AdminDashboard admin={admin} onLogout={handleAdminLogout} />
      : <AdminLogin onLogin={handleAdminLogin} />
  }

  if (view === 'landing') {
    return (
      <Landing
        onCustomer={() => {
          setLoginMode('customer')
          setView('customer-access')
        }}
        onVendor={() => setView('vendor-access')}
      />
    )
  }

  if (view === 'vendor-access') {
    return (
      <VendorAccess
        onRegister={() => setView('registration')}
        onLogin={() => {
          setLoginMode('vendor')
          setView('vendor-login')
        }}
        onBack={() => setView('landing')}
      />
    )
  }

  if (view === 'customer-access') {
    return (
      <CustomerAccess
        onRegister={() => setView('customer-registration')}
        onLogin={() => setView('customer-login')}
        onBack={() => setView('landing')}
      />
    )
  }

  if (view === 'registration') {
    return (
      <VendorRegistration
        onCancel={() => setView('vendor-login')}
        onRegister={handleRegistration}
      />
    )
  }

  if (view === 'customer-registration') {
    return (
      <CustomerRegistration
        onCancel={() => setView('customer-access')}
        onRegister={handleCustomerRegistration}
      />
    )
  }

  if (!user && (view === 'customer-login' || view === 'vendor-login')) {
    return (
      <Login
        mode={view === 'customer-login' ? 'customer' : 'vendor'}
        onLogin={(credentials) => handleLogin(credentials, view === 'customer-login' ? 'customer' : 'vendor')}
        onBack={() => setView(view === 'customer-login' ? 'customer-access' : 'vendor-access')}
      />
    )
  }

  if (view === 'customer-products') {
    return (
      <ProductList
        products={customerProducts}
        loading={customerProductsLoading}
        error={customerProductsError}
        customer={user}
        customerMode
        onRefresh={() => loadCustomerProducts().catch(() => {})}
        onBack={handleLogout}
        onSelectProduct={openProductDetails}
      />
    )
  }

  if (view === 'product-details') {
    return (
      <ProductDetails
        product={selectedProduct}
        loading={productDetailsLoading}
        error={productDetailsError}
        suggestedProducts={customerProducts}
        onBack={() => setView('customer-products')}
        onBuy={(product) => {
          if (!product) return
          setSelectedProduct(product)
          setView('product-details')
        }}
        onSelectProduct={openProductDetails}
      />
    )
  }

  if (view === 'product') {
    return (
      <ProductPage
        product={editingProduct}
        approved={user.approved === true}
        onCancel={() => {
          setEditingProduct(null)
          setView('dashboard')
        }}
        onSave={handleProductSave}
      />
    )
  }

  if (view === 'products') {
    return (
      <ProductList
        products={products}
        loading={productsLoading}
        error={productsError}
        onRefresh={() => loadProducts(user.email).catch(() => {})}
        onBack={() => setView('dashboard')}
        onEdit={handleEditProduct}
        onSelectProduct={openProductDetails}
        onProduct={() => {
          setEditingProduct(null)
          setView('product')
        }}
      />
    )
  }

  return (
    <Dashboard
      vendor={vendor}
      products={products}
      onLogout={handleLogout}
      onProducts={() => setView('products')}
      onRegister={() => setView('registration')}
      onProduct={() => {
        setEditingProduct(null)
        setView('product')
      }}
      onEdit={handleEditProduct}
    />
  )
}

export default App
