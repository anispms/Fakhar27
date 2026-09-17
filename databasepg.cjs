const {Client} = require('pg')
const express=require('express')
const cors = require('cors')

const app=express()
app.use(express.json())
app.use(cors())

const client = new Client({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  port: Number(process.env.PGPORT) || 5432,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "postgres",
})

client.connect(). then(() =>console.log("connected"))

app.post('/postData', async (req, res) => {
  const { email, password } = req.body

  try {
    const result = await client.query(
      `INSERT INTO "user" (email, password)
       VALUES ($1, $2)
       RETURNING email`,
      [email, password]
    )

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0],
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/fetchData',(req,res)=>{

  const fetch_query='SELECT * FROM "Sab Kuch Bechoo og"'

  client.query(fetch_query,(err,result)=>{

    if(err)
      {
        res.send(err)
      }else{
        res.send(result.rows)
      }

  })

})
 
app.get('/fetchbyId/:id',(req,res)=>{
  const id=req.params.id
  const fetch_query='SELECT * FROM "Sab Kuch Bechoo og" WHERE id=$1'
  client.query(fetch_query,[id],(err,result)=>{
    if(err)
    {
      res.send(err)
    }else{
      res.send(result.rows)
    }
  })
})

app.listen(3002, () => {
  console.log("legacy database server is running on port 3002")
});
