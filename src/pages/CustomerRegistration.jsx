import { useState } from 'react'

export default function CustomerRegistration({ onCancel, onRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()

    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and a password with at least 6 characters.')
      return
    }

    setError('')
    onRegister({ email: email.trim(), password })
  }

  return (
    <main className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Customer registration</p>
        <h2>Create your account</h2>
        <p className="muted">Register with your email and password, then log in to shop.</p>
        {error && <div className="error">{error}</div>}

        <label className="label">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </label>

        <label className="label">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength="6" required />
        </label>

        <button className="primary" type="submit">Register</button>
        <button className="secondary login-back" type="button" onClick={onCancel}>Back</button>
      </form>
    </main>
  )
}
