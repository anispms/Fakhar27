import { useState } from 'react'

export const marketplaceCategories = [
  { name: 'Fashion', subcategories: ['Men', 'Women', 'Kids', 'Accessories'] },
  { name: 'Food', subcategories: ['Fresh food', 'Snacks', 'Beverages', 'Packaged food'] },
  { name: 'Grocery', subcategories: ['Fruits and vegetables', 'Staples', 'Dairy', 'Household essentials'] },
  { name: 'Electronics', subcategories: ['Mobiles', 'Computers', 'Audio', 'Accessories'] },
  { name: 'Home', subcategories: ['Furniture', 'Kitchen', 'Decor', 'Bedding'] },
  { name: 'Beauty', subcategories: ['Skincare', 'Haircare', 'Makeup', 'Personal care'] },
  { name: 'Sports', subcategories: ['Fitness', 'Outdoor', 'Team sports', 'Sportswear'] },
]

export default function CategoryDrawer({ onLogout, onCategorySelect, onSubcategorySelect, selectedCategory = 'All' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState(null)

  function selectCategory(category) {
    onCategorySelect?.(category)
    setIsOpen(false)
  }

  return (
    <>
      <button className="category-menu-trigger" type="button" onClick={() => setIsOpen(true)} aria-label="Open categories menu" aria-expanded={isOpen}>
        <span />
        <span />
        <span />
      </button>

      {isOpen && (
        <div className="category-drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false)
        }}>
          <aside className="category-drawer" aria-label="Marketplace categories">
            <div className="category-drawer-heading">
              <div>
                <p className="eyebrow">Browse</p>
                <h2>Categories</h2>
              </div>
              <button className="category-drawer-close" type="button" onClick={() => setIsOpen(false)} aria-label="Close categories menu">×</button>
            </div>

            <button className={`drawer-category-all ${selectedCategory === 'All' ? 'is-selected' : ''}`} type="button" onClick={() => selectCategory('All')}>
              All products
            </button>

            <nav className="drawer-category-list">
              {marketplaceCategories.map((category) => {
                const isExpanded = expandedCategory === category.name
                return (
                  <div className="drawer-category-group" key={category.name}>
                    <button className={`drawer-category-button ${selectedCategory === category.name ? 'is-selected' : ''}`} type="button" onClick={() => setExpandedCategory(isExpanded ? null : category.name)} aria-expanded={isExpanded}>
                      <span>{category.name}</span>
                      <span className="drawer-category-arrow">{isExpanded ? '−' : '+'}</span>
                    </button>
                    {isExpanded && (
                      <div className="drawer-subcategory-list">
                        {category.subcategories.map((subcategory) => (
                          <button type="button" key={subcategory} onClick={() => onSubcategorySelect?.(category.name, subcategory)}>{subcategory}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </nav>

            <button className="drawer-logout" type="button" onClick={onLogout}>Log out</button>
          </aside>
        </div>
      )}
    </>
  )
}