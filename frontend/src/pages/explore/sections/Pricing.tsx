export function Pricing() {
  return (
    <section className="mir-section" id="pricing">
      <div className="eyebrow">15 — Support the journey</div>
      <div className="mir-section-head">
        <div>
          <h2>
            Simple, heritage-friendly
            <br />
            <em>pricing.</em>
          </h2>
        </div>
      </div>

      <div className="mir-pricing-grid">
        <div className="mir-price-card">
          <span className="p-tag">For curious explorers</span>
          <h3>Explorer</h3>
          <div className="mir-price-amount">
            ₹0<small>/ forever</small>
          </div>
          <p>Everything you need to begin your heritage journey.</p>
          <ul className="mir-price-features">
            <li>Explore India's living heritage</li>
            <li>50+ recipes &amp; 10 stories</li>
            <li>Festival calendar &amp; maps</li>
            <li>Daily quiz &amp; leaderboards</li>
          </ul>
          <button type="button" className="mir-price-btn" data-price="free">
            Using currently
          </button>
        </div>

        <div className="mir-price-card featured">
          <span className="p-tag">For deeper discovery</span>
          <h3>Heritage Plus</h3>
          <div className="mir-price-amount">
            ₹149<small>/ month</small>
          </div>
          <p>A richer experience for learners and heritage enthusiasts.</p>
          <ul className="mir-price-features">
            <li>Everything in Explorer</li>
            <li>Extended regional profiles</li>
            <li>Interactive learning journeys</li>
            <li>Unlimited AI Heritage Guide</li>
            <li>Downloadable story cards</li>
          </ul>
          <button type="button" className="mir-price-btn primary" data-price="plus">
            Coming Soon
          </button>
        </div>

        <div className="mir-price-card">
          <span className="p-tag">For families</span>
          <h3>Family Archive</h3>
          <div className="mir-price-amount">
            ₹499<small>/ month</small>
          </div>
          <p>Turn family memories and traditions into something worth passing on.</p>
          <ul className="mir-price-features">
            <li>Everything in Heritage Plus</li>
            <li>Up to 6 family profiles</li>
            <li>Recipe &amp; story collections</li>
            <li>Pass-it-on family projects</li>
            <li>Priority heritage support</li>
          </ul>
          <button type="button" className="mir-price-btn" data-price="family">
            Coming Soon
          </button>
        </div>
      </div>

      <p className="mir-price-note">All prices in Indian Rupees (INR) · GST included · Cancel anytime</p>
    </section>
  )
}
