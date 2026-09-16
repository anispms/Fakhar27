import { useState } from 'react'

export default function Login({ mode = 'vendor', onLogin, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter email and password')
      return
    }
    setError('')
    onLogin({ email: email.trim(), password })
  }

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <h2>{mode === 'customer' ? 'Customer login' : 'Vendor login'}</h2>
        <p className="muted">Enter your email and password to continue.</p>
        {error && <div className="error">{error}</div>}

        <label className="label">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="label">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        <button className="primary" type="submit">
          Login
        </button>
        <button className="secondary login-back" type="button" onClick={onBack}>
          Back
        </button>
      </form>
    </div>
  )
}
