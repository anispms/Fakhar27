export default function Landing({ onCustomer, onVendor }) {
  return (
    <main className="login-container choice-container">
      <section className="login-card choice-card">
        <header className="marketplace-brandbar">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Sab Kuch Bechoo</span>
          <span className="brand-status"><i aria-hidden="true" /> Open marketplace</span>
        </header>

        <div className="choice-layout">
          <div className="choice-copy">
            <p className="eyebrow">The everyday marketplace</p>
            <h1>Good finds.<br /><em>Right here.</em></h1>
            <p className="welcome-lead">Shop useful things from trusted local sellers, or bring your own best products to the shelf.</p>
            <div className="choice-actions">
              <button className="primary" type="button" onClick={onCustomer}>Start shopping <span aria-hidden="true">&#8594;</span></button>
              <button className="secondary" type="button" onClick={onVendor}>Open a seller shop</button>
            </div>
            <p className="choice-note"><span aria-hidden="true">&#10003;</span> Approved sellers &nbsp; <span aria-hidden="true">&#10003;</span> Easy browsing</p>
          </div>

          <div className="choice-showcase" aria-label="Marketplace highlights">
            <div className="showcase-orbit orbit-one" />
            <div className="showcase-orbit orbit-two" />
            <div className="showcase-card showcase-card-main">
              <span className="showcase-label">Today&apos;s edit</span>
              <strong>Small joys,<br />better prices.</strong>
              <span className="showcase-arrow" aria-hidden="true">&#8599;</span>
            </div>
            <div className="showcase-card showcase-card-mini">
              <span>Everything At</span>
              <strong>One</strong>
              <small>Place</small>
            </div>
          </div>
        </div>

        <footer className="choice-footer">
          <span>Fashion</span><span>Food</span><span>Home</span><span>Electronics</span><span>Beauty</span>
          <span className="footer-prompt">Everything you need, in one place.</span>
        </footer>
      </section>
    </main>
  )
}
