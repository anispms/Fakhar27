const { Client } = require('pg')
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')

const app = express()
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
const imageDirectory = path.join(__dirname, 'uploads', 'products')
fs.mkdirSync(imageDirectory, { recursive: true })

const imageStorage = multer.diskStorage({
	destination: imageDirectory,
	filename: (req, file, callback) => {
		const extension = path.extname(file.originalname).toLowerCase()
		callback(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`)
	},
})

const uploadImages = multer({
	storage: imageStorage,
	limits: { fileSize: 10 * 1024 * 1024 },
})

app.use(express.json({ limit: '15mb' }))
app.use(cors())
app.use('/product-images', express.static(imageDirectory))

const client = new Client({
	host: 'localhost',
	user: 'postgres',
	port: 5432,
	password: 'REDACTED_LOCAL_DEV_PASSWORD',
	database: 'postgres',
})

async function startServer() {
	await client.connect()
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
	await client.query(`ALTER TABLE public.product ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE`)
	await client.query(`ALTER TABLE public.product ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Fashion'`)
	await client.query(`ALTER TABLE public.product ADD COLUMN IF NOT EXISTS subcategory VARCHAR(80) NOT NULL DEFAULT 'Men'`)
	await client.query(`ALTER TABLE public.product ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2)`)
	await client.query(`UPDATE public.product SET selling_price = price WHERE selling_price IS NULL`)
	await client.query(`ALTER TABLE public.product ALTER COLUMN selling_price SET DEFAULT 0`)
	await client.query(`ALTER TABLE public.product ALTER COLUMN selling_price SET NOT NULL`)
	console.log('connected')
}

async function isApproved(email) {
	const result = await client.query(
		'SELECT approved FROM "user" WHERE LOWER(email) = LOWER($1)',
		[email],
	)
	return result.rows[0]?.approved === true
}

async function requireApproval(email, res) {
	if (!(await isApproved(email))) {
		res.status(403).json({ error: 'Your account must be approved before you can manage products.' })
		return false
	}
	return true
}

app.post('/postProduct', uploadImages.array('images', 10), async (req, res) => {
	const {
		userEmail,
		productName,
		category,
		subcategory,
		price,
		sellingPrice,
		description,
		stock,
		status = 'active',
		hsnCode,
		videos = '[]',
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
			[
				userEmail,
				productName,
				category,
				subcategory,
				price,
				sellingPrice,
				description,
				stock,
				status,
				hsnCode,
				JSON.stringify(images),
				videos,
			],
		)

		res.status(201).json({
			message: 'Product saved successfully',
			product: result.rows[0],
		})
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
				 SELECT shop_name
				 FROM public.vendor AS candidate
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
				 SELECT shop_name
				 FROM public.vendor AS candidate
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
				 SELECT shop_name
				 FROM public.vendor AS candidate
				 WHERE LOWER(candidate.user_email) = LOWER(product.user_email) OR candidate.user_email IS NULL
				 ORDER BY COALESCE(LOWER(candidate.user_email) = LOWER(product.user_email), FALSE) DESC,
					 ABS(EXTRACT(EPOCH FROM (candidate.created_at - product.created_at)))
				 LIMIT 1
			 ) AS vendor ON TRUE
			 WHERE product.id = $1 AND product.approved = TRUE AND product.status = 'active'`,
			[Number(req.params.id)],
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Approved product not found' })
		}

		res.json(result.rows[0])
	} catch (error) {
		res.status(500).json({ error: error.message })
	}
})

app.put('/products/:id', uploadImages.array('images', 10), async (req, res) => {
	const {
		userEmail,
		productName,
		category,
		subcategory,
		price,
		sellingPrice,
		description,
		stock,
		status = 'active',
		hsnCode,
		existingImages = '[]',
		videos = '[]',
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
			 SET product_name = $1,
				 category = $2,
				 subcategory = $3,
				 price = $4,
				 selling_price = $5,
				 description = $6,
				 stock = $7,
				 status = $8,
				 approved = FALSE,
				 hsn_code = $9,
				 images = $10::jsonb,
				 videos = $11::jsonb
			 WHERE id = $12 AND user_email = $13
			 RETURNING *`,
			[
				productName,
				category,
				subcategory,
				price,
				sellingPrice,
				description,
				stock,
				status,
				hsnCode,
				JSON.stringify(images),
				JSON.stringify(videos),
				Number(req.params.id),
				userEmail,
			],
		)

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Product not found' })
		}

		res.json({ message: 'Product updated successfully', product: result.rows[0] })
	} catch (error) {
		res.status(500).json({ error: error.message })
	}
})

app.get('/products/:email', async (req, res) => {
	try {
		if (!(await requireApproval(req.params.email, res))) return

		const result = await client.query(
			'SELECT * FROM public.product WHERE user_email = $1 ORDER BY created_at DESC',
			[req.params.email],
		)
		res.json(result.rows)
	} catch (error) {
		res.status(500).json({ error: error.message })
	}
})

startServer()
	.then(() => {
		app.listen(3001, () => console.log('product server is running on port 3001'))
	})
	.catch((error) => {
		console.error('Unable to start product server:', error.message)
		process.exit(1)
	})
