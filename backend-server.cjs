// Combined backend for hosted deployment (e.g. Render).
// Merges the vendor/admin/auth API and the product API into a single
// Express app on one port, and reads DB config from DATABASE_URL so it
// works against a hosted Postgres instance. Local dev keeps using the
// separate server.cjs / vendordatabase.cjs / productdatabase.cjs files.
const { Client } = require('pg')
const crypto = require('crypto')
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const app = express()

const PORT = process.env.PORT || 3000
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const client = process.env.DATABASE_URL
  ? new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Client({
      host: process.env.PGHOST || 'localhost',
      user: process.env.PGUSER || 'postgres',
      port: Number(process.env.PGPORT) || 5432,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE || 'postgres',
    })

const adminTokens = new Set()

const productSubcategories = {
  Fashion: ['Men', 'Women', 'Kids', 'Accessories'],
  Food: ['Fresh food', 'Snacks', 'Beverages', 'Packaged food'],
  Grocery: ['Fruits and vegetables', 'Staples', 'Dairy', 'Household essentials'],
  Electronics: ['Mobiles', 'Computers', 'Audio', 'Accessories'],
  Home: ['Furniture', 'Kitchen', 'Decor', 'Bedding'],
  Beauty: ['Skincare', 'Haircare', 'Makeup', 'Personal care'],
  Sports: ['Fitness', 'Outdoor', 'Team sports', 'Sportswear'],
}
const productCategories = Object.keys(productSubcategories)

// Render's disk is ephemeral: uploaded images are lost on redeploy/restart.
const imageDirectory = path.join(__dirname, 'uploads', 'products')
fs.mkdirSync(imageDirectory, { recursive: true })

const imageStorage = multer.diskStorage({
  destination: imageDirectory,
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`)
  },
})
const uploadImages = multer({ storage: imageStorage, limits: { fileSize: 10 * 1024 * 1024 } })

app.use(express.json({ limit: '15mb' }))
app.use(cors())
app.use('/product-images', express.static(imageDirectory))

async function startServer() {
  await client.connect()

  await client.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT FALSE
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS admin (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(
    `INSERT INTO admin (email, password) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
    [ADMIN_EMAIL, ADMIN_PASSWORD],
  )
  await client.query(`
    CREATE TABLE IF NOT EXISTS vendor (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255),
      shop_name VARCHAR(150) NOT NULL,
      shop_address TEXT NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      product_type VARCHAR(100) NOT NULL,
      hsn_code VARCHAR(50) NOT NULL,
      gst_number VARCHAR(50) NOT NULL,
      registration_year INTEGER NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS marketplace_banner (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      title VARCHAR(180) NOT NULL,
      subtitle VARCHAR(300) NOT NULL DEFAULT '',
      button_label VARCHAR(80) NOT NULL DEFAULT '',
      button_url VARCHAR(500) NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.product (
      id SERIAL PRIMARY KEY,
      user_email VARCHAR(255) NOT NULL,
      product_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'Fashion',
      subcategory VARCHAR(80) NOT NULL DEFAULT 'Men',
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
      description TEXT NOT NULL,
      stock INTEGER NOT NULL CHECK (stock >= 0),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      approved BOOLEAN NOT NULL DEFAULT FALSE,
      hsn_code VARCHAR(50) NOT NULL,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      videos JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('connected')
}

async function authenticateAdmin(email, password) {
  const result = await client.query(
    `SELECT email FROM admin WHERE LOWER(email) = LOWER($1) AND password = $2`,
    [email.trim(), password],
  )
  return result.rows[0] || null
}

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token')
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin authentication is required' })
  }
  next()
}

async function isApproved(email) {
  const result = await client.query('SELECT approved FROM "user" WHERE LOWER(email) = LOWER($1)', [email])
  return result.rows[0]?.approved === true
}

async function requireApproval(email, res) {
  if (!(await isApproved(email))) {
    res.status(403).json({ error: 'Your account must be approved before you can manage products.' })
    return false
  }
  return true
}

// ---- Auth / vendor / admin routes ----

app.post('/postData', async (req, res) => {
  const {
    email, password, shopName, shopAddress, mobileNumber,
    productType, hsnCode, gstNumber, registrationYear,
  } = req.body

  if (!email || !password || !shopName || !shopAddress || !mobileNumber || !productType || !hsnCode || !gstNumber || !registrationYear) {
    return res.status(400).json({ error: 'All registration fields are required' })
  }

  try {
    await client.query('BEGIN')
    const result = await client.query(
      `INSERT INTO "user" (email, password) VALUES ($1, $2) RETURNING email`,
      [email, password],
    )
    const vendorResult = await client.query(
      `INSERT INTO vendor
        (user_email, shop_name, shop_address, mobile_number, product_type, hsn_code, gst_number, registration_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [email.trim(), shopName, shopAddress, mobileNumber, productType, hsnCode, gstNumber, registrationYear],
    )
    await client.query('COMMIT')
    res.status(201).json({ message: 'Vendor registered successfully', user: result.rows[0], vendor: vendorResult.rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  }
})

app.post('/customer/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'A valid email and a password with at least 6 characters are required' })
  }

  try {
    const result = await client.query(
      `INSERT INTO "user" (email, password, approved) VALUES ($1, $2, TRUE) RETURNING email, approved`,
      [email.trim(), password],
    )
    res.status(201).json({ message: 'Customer registered successfully', user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists' })
    res.status(500).json({ error: err.message })
  }
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

  try {
    const result = await client.query(
      `SELECT email FROM "user" WHERE LOWER(email) = LOWER($1) AND password = $2 AND approved = TRUE`,
      [email.trim(), password],
    )
    if (result.rows.length === 0) {
      const pendingUser = await client.query(
        `SELECT email FROM "user" WHERE LOWER(email) = LOWER($1) AND password = $2 AND approved = FALSE`,
        [email.trim(), password],
      )
      if (pendingUser.rows.length > 0) return res.status(403).json({ error: 'Your account is waiting for approval.' })
      return res.status(401).json({ error: 'User is not registered or credentials are incorrect' })
    }
    res.json({ message: 'Login successful', user: { ...result.rows[0], approved: true } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Admin email and password are required' })

  try {
    const result = await authenticateAdmin(email, password)
    if (!result) return res.status(401).json({ error: 'Invalid admin credentials' })
    const token = crypto.randomBytes(32).toString('hex')
    adminTokens.add(token)
    res.json({ message: 'Admin login successful', token, admin: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/marketplace-banner', async (req, res) => {
  try {
    const result = await client.query(
      `SELECT title, subtitle, button_label, button_url, active FROM marketplace_banner WHERE id = 1 AND active = TRUE`,
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/admin/marketplace-banner', requireAdmin, async (req, res) => {
  try {
    const result = await client.query(`SELECT title, subtitle, button_label, button_url, active FROM marketplace_banner WHERE id = 1`)
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/admin/marketplace-banner', requireAdmin, async (req, res) => {
  const { title, subtitle = '', buttonLabel = '', buttonUrl = '', active = true } = req.body || {}
  const safeUrl = String(buttonUrl).trim()

  if (!String(title || '').trim()) return res.status(400).json({ error: 'Banner title is required' })
  if (safeUrl && !/^\/(?!\/)|^https?:\/\//i.test(safeUrl)) {
    return res.status(400).json({ error: 'Banner link must be a relative path or an http(s) URL' })
  }

  try {
    const result = await client.query(
      `INSERT INTO marketplace_banner (id, title, subtitle, button_label, button_url, active, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, button_label = EXCLUDED.button_label,
         button_url = EXCLUDED.button_url, active = EXCLUDED.active, updated_at = CURRENT_TIMESTAMP
       RETURNING title, subtitle, button_label, button_url, active`,
      [String(title).trim(), String(subtitle).trim(), String(buttonLabel).trim(), safeUrl, Boolean(active)],
    )
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await client.query(
      `SELECT account.email, account.approved, vendor.shop_name
       FROM "user" AS account
       LEFT JOIN LATERAL (
         SELECT candidate.shop_name
         FROM vendor AS candidate
         WHERE LOWER(candidate.user_email) = LOWER(account.email)
            OR (candidate.user_email IS NULL AND EXISTS (
                 SELECT 1 FROM public.product AS product
                 WHERE LOWER(product.user_email) = LOWER(account.email)
               ))
         ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(account.email), FALSE) DESC,
                  ABS(EXTRACT(EPOCH FROM (
                    candidate.created_at - COALESCE(
                      (SELECT MAX(product.created_at) FROM public.product AS product WHERE LOWER(product.user_email) = LOWER(account.email)),
                      candidate.created_at
                    )
                  )))
         LIMIT 1
       ) AS vendor ON TRUE
      WHERE vendor.shop_name IS NOT NULL
       ORDER BY account.email`,
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/users/:email/approval', requireAdmin, async (req, res) => {
  const { approved } = req.body
  if (typeof approved !== 'boolean') return res.status(400).json({ error: 'Approval must be true or false' })

  try {
    const result = await client.query(
      `UPDATE "user" SET approved = $1 WHERE LOWER(email) = LOWER($2) RETURNING email, approved`,
      [approved, req.params.email],
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const user = result.rows[0]
    const vendorResult = await client.query(
      `SELECT candidate.shop_name
       FROM vendor AS candidate
       WHERE LOWER(candidate.user_email) = LOWER($1)
          OR (candidate.user_email IS NULL AND EXISTS (
               SELECT 1 FROM public.product AS product WHERE LOWER(product.user_email) = LOWER($1)
             ))
       ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER($1), FALSE) DESC,
                ABS(EXTRACT(EPOCH FROM (
                  candidate.created_at - COALESCE(
                    (SELECT MAX(product.created_at) FROM public.product AS product WHERE LOWER(product.user_email) = LOWER($1)),
                    candidate.created_at
                  )
                )))
       LIMIT 1`,
      [user.email],
    )
    res.json({ user: { ...user, shop_name: vendorResult.rows[0]?.shop_name || null } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/users/:email', requireAdmin, async (req, res) => {
  const email = req.params.email
  const { shopName } = req.body || {}

  try {
    await client.query('BEGIN')
    const userResult = await client.query(`SELECT email FROM "user" WHERE LOWER(email) = LOWER($1)`, [email])
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Vendor not found' })
    }

    await client.query(`DELETE FROM public.product WHERE LOWER(user_email) = LOWER($1)`, [email])
    await client.query(
      `DELETE FROM vendor
       WHERE id = COALESCE(
         (SELECT candidate.id FROM vendor AS candidate WHERE LOWER(candidate.user_email) = LOWER($1) LIMIT 1),
         (SELECT candidate.id FROM vendor AS candidate
          WHERE candidate.user_email IS NULL AND candidate.shop_name = $2
          ORDER BY ABS(EXTRACT(EPOCH FROM (
            candidate.created_at - COALESCE(
              (SELECT MAX(product.created_at) FROM public.product AS product WHERE LOWER(product.user_email) = LOWER($1)),
              candidate.created_at
            )
          )))
          LIMIT 1)
       )`,
      [email, shopName || ''],
    )
    await client.query(`DELETE FROM "user" WHERE LOWER(email) = LOWER($1)`, [email])

    await client.query('COMMIT')
    res.json({ message: 'Vendor deleted successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  }
})

app.get('/admin/products', requireAdmin, async (req, res) => {
  try {
    const result = await client.query(
      `SELECT product.id, product.user_email, vendor.shop_name, product.product_name,
              product.category, product.subcategory, product.price, product.selling_price,
              product.description, product.stock, product.status, product.approved,
              product.hsn_code, product.images, product.videos, product.created_at
       FROM public.product AS product
       LEFT JOIN LATERAL (
         SELECT shop_name FROM public.vendor AS candidate
         WHERE LOWER(candidate.user_email) = LOWER(product.user_email) OR candidate.user_email IS NULL
         ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(product.user_email), FALSE) DESC,
                  ABS(EXTRACT(EPOCH FROM (candidate.created_at - product.created_at)))
         LIMIT 1
       ) AS vendor ON TRUE
       ORDER BY product.created_at DESC`,
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/admin/products/:id/approval', requireAdmin, async (req, res) => {
  const { approved } = req.body
  if (typeof approved !== 'boolean') return res.status(400).json({ error: 'Approval must be true or false' })

  try {
    const result = await client.query(
      `UPDATE public.product SET approved = $1
       WHERE id = $2
       RETURNING id, user_email, product_name, category, subcategory, price, selling_price,
             description, stock, status, approved, hsn_code, images, videos, created_at`,
      [approved, Number(req.params.id)],
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })

    const product = result.rows[0]
    const vendorResult = await client.query(
      `SELECT shop_name FROM public.vendor AS candidate
       WHERE LOWER(candidate.user_email) = LOWER($1) OR candidate.user_email IS NULL
       ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER($1), FALSE) DESC,
                ABS(EXTRACT(EPOCH FROM (candidate.created_at - $2::timestamp)))
       LIMIT 1`,
      [product.user_email, product.created_at],
    )
    res.json({ product: { ...product, shop_name: vendorResult.rows[0]?.shop_name || null } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const result = await client.query('DELETE FROM public.product WHERE id = $1 RETURNING id', [Number(req.params.id)])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json({ message: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ---- Product routes ----

app.post('/postProduct', uploadImages.array('images', 10), async (req, res) => {
  const {
    userEmail, productName, category, subcategory, price, sellingPrice,
    description, stock, status = 'active', hsnCode, videos = '[]',
  } = req.body

  if (!userEmail || !productName || !productCategories.includes(category) || !productSubcategories[category]?.includes(subcategory) || price === undefined || sellingPrice === undefined || !description || stock === undefined || !hsnCode) {
    return res.status(400).json({ error: 'All product fields are required' })
  }

  try {
    if (!(await requireApproval(userEmail, res))) return

    const uploadedFiles = Array.isArray(req.files) ? req.files : []
    const images = uploadedFiles.map((file) => `/product-images/${file.filename}`)
    const result = await client.query(
      `INSERT INTO public.product
        (user_email, product_name, category, subcategory, price, selling_price, description, stock, status, approved, hsn_code, images, videos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10, $11::jsonb, $12::jsonb)
       RETURNING *`,
      [userEmail, productName, category, subcategory, price, sellingPrice, description, stock, status, hsnCode, JSON.stringify(images), videos],
    )
    res.status(201).json({ message: 'Product saved successfully', product: result.rows[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/products', async (req, res) => {
  try {
    const result = await client.query(
      `SELECT product.*, vendor.shop_name
       FROM public.product AS product
       LEFT JOIN LATERAL (
         SELECT shop_name FROM public.vendor AS candidate
         WHERE LOWER(candidate.user_email) = LOWER(product.user_email) OR candidate.user_email IS NULL
         ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(product.user_email), FALSE) DESC,
                  ABS(EXTRACT(EPOCH FROM (candidate.created_at - product.created_at)))
         LIMIT 1
       ) AS vendor ON TRUE
       WHERE product.approved = TRUE
       ORDER BY product.created_at DESC`,
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/approved-products', async (req, res) => {
  try {
    const result = await client.query(
      `SELECT product.*, vendor.shop_name
       FROM public.product AS product
       LEFT JOIN LATERAL (
         SELECT shop_name FROM public.vendor AS candidate
         WHERE LOWER(candidate.user_email) = LOWER(product.user_email) OR candidate.user_email IS NULL
         ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(product.user_email), FALSE) DESC,
                  ABS(EXTRACT(EPOCH FROM (candidate.created_at - product.created_at)))
         LIMIT 1
       ) AS vendor ON TRUE
       WHERE product.approved = TRUE AND product.status = 'active'
       ORDER BY product.created_at DESC`,
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/products/id/:id', async (req, res) => {
  try {
    const result = await client.query(
      `SELECT product.*, vendor.shop_name
       FROM public.product AS product
       LEFT JOIN LATERAL (
         SELECT shop_name FROM public.vendor AS candidate
         WHERE LOWER(candidate.user_email) = LOWER(product.user_email) OR candidate.user_email IS NULL
         ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(product.user_email), FALSE) DESC,
                  ABS(EXTRACT(EPOCH FROM (candidate.created_at - product.created_at)))
         LIMIT 1
       ) AS vendor ON TRUE
       WHERE product.id = $1 AND product.approved = TRUE AND product.status = 'active'`,
      [Number(req.params.id)],
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Approved product not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.put('/products/:id', uploadImages.array('images', 10), async (req, res) => {
  const {
    userEmail, productName, category, subcategory, price, sellingPrice,
    description, stock, status = 'active', hsnCode, existingImages = '[]', videos = '[]',
  } = req.body

  if (!userEmail || !productName || !productCategories.includes(category) || !productSubcategories[category]?.includes(subcategory) || price === undefined || sellingPrice === undefined || !description || stock === undefined || !hsnCode) {
    return res.status(400).json({ error: 'All product fields are required' })
  }

  try {
    if (!(await requireApproval(userEmail, res))) return

    const uploadedFiles = Array.isArray(req.files) ? req.files : []
    const uploadedImages = uploadedFiles.map((file) => `/product-images/${file.filename}`)
    let retainedImages = []
    try {
      const parsedImages = JSON.parse(existingImages)
      retainedImages = Array.isArray(parsedImages) ? parsedImages : []
    } catch {}
    const images = uploadedImages.length > 0 ? uploadedImages : retainedImages
    const result = await client.query(
      `UPDATE public.product
       SET product_name = $1, category = $2, subcategory = $3, price = $4, selling_price = $5,
           description = $6, stock = $7, status = $8, approved = FALSE, hsn_code = $9,
           images = $10::jsonb, videos = $11::jsonb
       WHERE id = $12 AND user_email = $13
       RETURNING *`,
      [productName, category, subcategory, price, sellingPrice, description, stock, status, hsnCode, JSON.stringify(images), JSON.stringify(videos), Number(req.params.id), userEmail],
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' })
    res.json({ message: 'Product updated successfully', product: result.rows[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/products/:email', async (req, res) => {
  try {
    if (!(await requireApproval(req.params.email, res))) return
    const result = await client.query('SELECT * FROM public.product WHERE user_email = $1 ORDER BY created_at DESC', [req.params.email])
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

startServer()
  .then(() => {
    app.listen(PORT, () => console.log(`server is running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Unable to start server:', err.message)
    process.exit(1)
  })
