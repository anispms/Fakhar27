export default function VendorAccess({ onRegister, onLogin, onBack }) {
  return (
    <main className="login-container choice-container">
      <section className="login-card choice-card">
        <p className="eyebrow">Vendor portal</p>
        <h2>Start selling</h2>
        <p className="muted">Register your shop or sign in to manage your products.</p>
        <div className="choice-actions">
          <button className="primary" type="button" onClick={onRegister}>Register as a vendor</button>
          <button className="secondary" type="button" onClick={onLogin}>Already registered</button>
          <button className="text-button" type="button" onClick={onBack}>Back</button>
        </div>
      </section>
    </main>
  )
}
