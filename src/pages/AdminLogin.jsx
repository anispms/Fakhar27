import { useState } from 'react'

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter admin email and password')
      return
    }
    setError('')
    onLogin({ email: email.trim(), password })
  }

  return (
    <div className="login-container admin-login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Restricted access</p>
        <h2>Admin sign in</h2>
        <p className="muted">Sign in to manage vendor approvals.</p>
        {error && <div className="error">{error}</div>}
        <label className="label">
          <span>Admin email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="label">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="primary" type="submit">Sign in as admin</button>
      </form>
    </div>
  )
}