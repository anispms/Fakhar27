import { useState } from 'react'

const initialForm = {
  shopName: '',
  shopNumber: '',
  buildingStreet: '',
  city: '',
  pinCode: '',
  mobileNumber: '',
  productType: '',
  hsnCode: '',
  gstNumber: '',
  registrationYear: '',
  email: '',
  password: '',
}

export default function VendorRegistration({ onCancel, onRegister }) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const currentYear = new Date().getFullYear()
    const mobileNumber = form.mobileNumber.replace(/\D/g, '')
    const pinCode = form.pinCode.replace(/\D/g, '')
    const registrationYear = Number(form.registrationYear)

    if (mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    if (pinCode.length !== 6) {
      setError('Please enter a valid 6-digit PIN code.')
      return
    }

    if (registrationYear < 1900 || registrationYear > currentYear) {
      setError(`Registration year must be between 1900 and ${currentYear}.`)
      return
    }

    setError('')
    onRegister({
      ...form,
      mobileNumber,
      pinCode,
      shopAddress: [form.shopNumber, form.buildingStreet, form.city, pinCode].filter(Boolean).join(', '),
    })
  }

  return (
    <main className="registration-root">
      <form className="registration-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">Vendor onboarding</p>
            <h2>Register your shop</h2>
            <p className="muted">Add your business details to start selling.</p>
          </div>
          <span className="form-step">01 / 01</span>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-grid">
          <label className="label full-width">
            <span>Shop name</span>
            <input name="shopName" value={form.shopName} onChange={handleChange} placeholder="Enter your shop name" required />
          </label>
          <label className="label full-width">
            <span>Shop number</span>
            <input name="shopNumber" value={form.shopNumber} onChange={handleChange} placeholder="Shop or house number" required />
          </label>
          <label className="label full-width">
            <span>Building and street</span>
            <input name="buildingStreet" value={form.buildingStreet} onChange={handleChange} placeholder="Building name, street and area" required />
          </label>
          <label className="label">
            <span>City</span>
            <input name="city" value={form.city} onChange={handleChange} placeholder="City" required />
          </label>
          <label className="label">
            <span>PIN code</span>
            <input name="pinCode" type="text" inputMode="numeric" value={form.pinCode} onChange={handleChange} placeholder="6-digit PIN code" maxLength="6" required />
          </label>
          <label className="label">
            <span>Mobile number</span>
            <input name="mobileNumber" type="tel" inputMode="numeric" value={form.mobileNumber} onChange={handleChange} placeholder="10-digit mobile number" maxLength="10" required />
          </label>
          <label className="label">
            <span>Product type</span>
            <input name="productType" value={form.productType} onChange={handleChange} placeholder="e.g. Grocery, apparel" required />
          </label>
          <label className="label">
            <span>HSN code</span>
            <input name="hsnCode" value={form.hsnCode} onChange={handleChange} placeholder="Enter HSN code" required />
          </label>
          <label className="label">
            <span>GST number</span>
            <input name="gstNumber" value={form.gstNumber} onChange={handleChange} placeholder="Enter GST number" required />
          </label>
          <label className="label">
            <span>Year of registration</span>
            <input name="registrationYear" type="number" min="1900" max={new Date().getFullYear()} value={form.registrationYear} onChange={handleChange} placeholder="YYYY" required />
          </label>
          <label className="label full-width">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label className="label full-width">
            <span>Password</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" required />
          </label>
        </div>

        <div className="form-actions">
          <button className="secondary" type="button" onClick={onCancel}>Cancel</button>
          <button className="primary" type="submit">Register vendor</button>
        </div>
      </form>
    </main>
  )
}