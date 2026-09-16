const {Client} = require('pg')
const crypto = require('crypto')
const express=require('express')
const cors = require('cors')
const { authenticateAdmin, initializeAdminDatabase } = require('./admindatabase.cjs')

const app=express()
app.use(express.json())
app.use(cors())

const adminTokens = new Set()

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "REDACTED_LOCAL_DEV_PASSWORD",
  database: "postgres"
})

async function startServer() {
  await client.connect()
  await initializeAdminDatabase()
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user" (
      email VARCHAR(255) PRIMARY KEY,
      password VARCHAR(255) NOT NULL,
      approved BOOLEAN NOT NULL DEFAULT FALSE
    )
  `)
  await client.query(`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE`)
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
  await client.query(`ALTER TABLE vendor ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)`)
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
  console.log("connected")
}

app.post('/postData', async (req, res) => {
  const {
    email,
    password,
    shopName,
    shopAddress,
    mobileNumber,
    productType,
    hsnCode,
    gstNumber,
    registrationYear,
  } = req.body

  if (!email || !password || !shopName || !shopAddress || !mobileNumber || !productType || !hsnCode || !gstNumber || !registrationYear) {
    return res.status(400).json({ error: 'All registration fields are required' })
  }

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `INSERT INTO "user" (email, password)
       VALUES ($1, $2)
       RETURNING email`,
      [email, password]
    )

    const vendorResult = await client.query(
      `INSERT INTO vendor
        (user_email, shop_name, shop_address, mobile_number, product_type, hsn_code, gst_number, registration_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [email.trim(), shopName, shopAddress, mobileNumber, productType, hsnCode, gstNumber, registrationYear]
    )

    await client.query('COMMIT')

    res.status(201).json({
      message: 'Vendor registered successfully',
      user: result.rows[0],
      vendor: vendorResult.rows[0],
    })
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
      `INSERT INTO "user" (email, password, approved)
       VALUES ($1, $2, TRUE)
       RETURNING email, approved`,
      [email.trim(), password],
    )

    res.status(201).json({ message: 'Customer registered successfully', user: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    res.status(500).json({ error: err.message })
  }
})

app.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const result = await client.query(
      `SELECT email FROM "user"
       WHERE LOWER(email) = LOWER($1) AND password = $2 AND approved = TRUE`,
      [email.trim(), password]
    )

    if (result.rows.length === 0) {
      const pendingUser = await client.query(
        `SELECT email FROM "user"
         WHERE LOWER(email) = LOWER($1) AND password = $2 AND approved = FALSE`,
        [email.trim(), password],
      )

      if (pendingUser.rows.length > 0) {
        return res.status(403).json({ error: 'Your account is waiting for approval.' })
      }

      return res.status(401).json({ error: 'User is not registered or credentials are incorrect' })
    }

    res.json({ message: 'Login successful', user: { ...result.rows[0], approved: true } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Admin email and password are required' })
  }

  try {
    const result = await authenticateAdmin(email, password)

    if (!result) {
      return res.status(401).json({ error: 'Invalid admin credentials' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    adminTokens.add(token)
    res.json({ message: 'Admin login successful', token, admin: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token')
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin authentication is required' })
  }
  next()
}

app.get('/marketplace-banner', async (req, res) => {
  try {
    const result = await client.query(
      `SELECT title, subtitle, button_label, button_url, active
       FROM marketplace_banner WHERE id = 1 AND active = TRUE`,
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/admin/marketplace-banner', requireAdmin, async (req, res) => {
  try {
    const result = await client.query(
      `SELECT title, subtitle, button_label, button_url, active
       FROM marketplace_banner WHERE id = 1`,
    )
    res.json(result.rows[0] || null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/admin/marketplace-banner', requireAdmin, async (req, res) => {
  const { title, subtitle = '', buttonLabel = '', buttonUrl = '', active = true } = req.body || {}
  const safeUrl = String(buttonUrl).trim()

  if (!String(title || '').trim()) {
    return res.status(400).json({ error: 'Banner title is required' })
  }

  if (safeUrl && !/^\/(?!\/)|^https?:\/\//i.test(safeUrl)) {
    return res.status(400).json({ error: 'Banner link must be a relative path or an http(s) URL' })
  }

  try {
    const result = await client.query(
      `INSERT INTO marketplace_banner (id, title, subtitle, button_label, button_url, active, updated_at)
       VALUES (1, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle = EXCLUDED.subtitle,
         button_label = EXCLUDED.button_label,
         button_url = EXCLUDED.button_url,
         active = EXCLUDED.active,
         updated_at = CURRENT_TIMESTAMP
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
                      (SELECT MAX(product.created_at)
                       FROM public.product AS product
                       WHERE LOWER(product.user_email) = LOWER(account.email)),
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

  if (typeof approved !== 'boolean') {
    return res.status(400).json({ error: 'Approval must be true or false' })
  }

  try {
    const result = await client.query(
      `UPDATE "user" SET approved = $1
       WHERE LOWER(email) = LOWER($2)
       RETURNING email, approved`,
      [approved, req.params.email],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    const vendorResult = await client.query(
      `SELECT candidate.shop_name
       FROM vendor AS candidate
       WHERE LOWER(candidate.user_email) = LOWER($1)
          OR (candidate.user_email IS NULL AND EXISTS (
               SELECT 1 FROM public.product AS product
               WHERE LOWER(product.user_email) = LOWER($1)
             ))
       ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER($1), FALSE) DESC,
                ABS(EXTRACT(EPOCH FROM (
                  candidate.created_at - COALESCE(
                    (SELECT MAX(product.created_at)
                     FROM public.product AS product
                     WHERE LOWER(product.user_email) = LOWER($1)),
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

    const userResult = await client.query(
      `SELECT email FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [email],
    )

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Vendor not found' })
    }

    await client.query(
      `DELETE FROM public.product WHERE LOWER(user_email) = LOWER($1)`,
      [email],
    )
    await client.query(
      `DELETE FROM vendor
       WHERE id = COALESCE(
         (SELECT candidate.id
          FROM vendor AS candidate
          WHERE LOWER(candidate.user_email) = LOWER($1)
          LIMIT 1),
         (SELECT candidate.id
          FROM vendor AS candidate
          WHERE candidate.user_email IS NULL
            AND candidate.shop_name = $2
          ORDER BY ABS(EXTRACT(EPOCH FROM (
            candidate.created_at - COALESCE(
              (SELECT MAX(product.created_at)
               FROM public.product AS product
               WHERE LOWER(product.user_email) = LOWER($1)),
              candidate.created_at
            )
          )))
          LIMIT 1)
       )`,
      [email, shopName || ''],
    )
    await client.query(
      `DELETE FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [email],
    )

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
         SELECT shop_name
         FROM public.vendor AS candidate
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

  if (typeof approved !== 'boolean') {
    return res.status(400).json({ error: 'Approval must be true or false' })
  }

  try {
    const result = await client.query(
      `UPDATE public.product SET approved = $1
       WHERE id = $2
       RETURNING id, user_email, product_name, category, subcategory, price, selling_price,
             description, stock, status, approved, hsn_code, images, videos, created_at`,
      [approved, Number(req.params.id)],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const product = result.rows[0]
    const vendorResult = await client.query(
      `SELECT shop_name
       FROM public.vendor AS candidate
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
    const result = await client.query(
      'DELETE FROM public.product WHERE id = $1 RETURNING id',
      [Number(req.params.id)],
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json({ message: 'Product deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

startServer()
  .then(() => {
    app.listen(3000, () => {
      console.log("server is running....")
    })
  })
  .catch((err) => {
    console.error('Unable to start server:', err.message)
    process.exit(1)
  })