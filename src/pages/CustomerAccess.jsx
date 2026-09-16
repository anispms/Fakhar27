export default function CustomerAccess({ onRegister, onLogin, onBack }) {
  return (
    <main className="login-container choice-container">
      <section className="login-card choice-card">
        <p className="eyebrow">Customer access</p>
        <h2>Welcome to the marketplace</h2>
        <p className="muted">Choose whether you already have a customer account.</p>
        <div className="choice-actions">
          <button className="primary" type="button" onClick={onLogin}>Already registered</button>
          <button className="secondary" type="button" onClick={onRegister}>Not registered</button>
          <button className="text-button" type="button" onClick={onBack}>Back</button>
        </div>
      </section>
    </main>
  )
}
