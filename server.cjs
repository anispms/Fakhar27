const { spawn } = require('child_process')

const services = [
  { name: 'admin/vendor', script: 'vendordatabase.cjs' },
  { name: 'products', script: 'productdatabase.cjs' },
  { name: 'legacy', script: 'databasepg.cjs' },
]

const children = services.map(({ name, script }) => {
  const child = spawn(process.execPath, [script], {
    env: process.env,
    stdio: 'inherit',
  })

  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`)
  })

  child.on('exit', (code, signal) => {
    if (code !== 0 && signal === null) {
      console.error(`[${name}] stopped with exit code ${code}`)
    }
  })

  return child
})

console.log('All database services are starting.')
console.log('Admin/vendor: http://localhost:3000')
console.log('Products: http://localhost:3001')
console.log('Legacy data: http://localhost:3002')

function stopServices() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

process.on('SIGINT', () => {
  stopServices()
  process.exit(0)
})

process.on('SIGTERM', () => {
  stopServices()
  process.exit(0)
})

process.on('exit', stopServices)
