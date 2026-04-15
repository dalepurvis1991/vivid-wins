# Vivid Wins - Pokémon Raffle Website

A professional static website for the Vivid Wins Pokémon raffle business, built with HTML/CSS and deployed on Vercel.

## 📋 Features

✅ **Home Page** - Welcome & overview of the business  
✅ **Live Auctions** - Display current raffles with real-time spot tracking  
✅ **How to Enter** - Clear entry instructions and rules  
✅ **Contact Page** - Contact form and support information  
✅ **Responsive Design** - Fully mobile-friendly  
✅ **Automation Ready** - Built to trigger webhooks & automations  

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/vivid-wins.git
cd vivid-wins

# Open in browser
open index.html
# or
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/yourusername/vivid-wins.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect and deploy
   - Your site will be live at `https://vivid-wins.vercel.app`

3. **Custom Domain:**
   - In Vercel dashboard: Project Settings → Domains
   - Add your domain `vivid-wins.co.uk`
   - Update DNS records in Cloudflare

## 📝 Pages

### index.html
Main landing page introducing Vivid Wins with hero section and feature cards.

### auctions.html
Live auction display with:
- Filterable auction cards
- Spot tracking with progress bars
- Status indicators (Open, Almost Full, Sold Out)
- Automation IDs for webhook triggers
- Sample data included (replace with your API)

### how-to-enter.html
Step-by-step entry guide with rules and FAQ.

### contact.html
Contact form and support information.

## 🔧 Customization

### Update Auction Data
Edit the `auctionsData` array in `auctions.html`:
```javascript
const auctionsData = [
    {
        id: 1,
        title: "Your Product Name",
        emoji: "📦",
        prize: "£XXX",
        totalSpots: 50,
        soldSpots: 10,
        pricePerSpot: "£5",
        drawDate: "2026-04-20",
        status: "open",
        automationId: "auction_001"
    }
];
```

### Connect to Automations
The `enterAuction()` function in `auctions.html` triggers automations:
```javascript
function enterAuction(auctionId, automationId) {
    // Send to your automation service (Zapier, Make, etc.)
    // Example: Call webhook when spots fill up
}
```

### Update Social Links
Replace Facebook URLs throughout with your actual pages:
- `https://www.facebook.com/people/VividWins/61572047675668/`

## 🎨 Colors & Branding

- **Primary Gold:** `#FFD700`
- **Primary Red:** `#FF6B6B`
- **Dark:** `#1F2937`
- **Background:** Linear gradient gold to red

## 📱 Responsive Breakpoints

- **Desktop:** Full 3-4 column grid
- **Tablet:** 2 column grid
- **Mobile:** Single column with adjusted spacing

## 🔐 Environment Variables

For Vercel deployments, set environment variables in Vercel dashboard:
- `FACEBOOK_PAGE_URL` - Your Vivid Wins Facebook page
- `SUPPORT_EMAIL` - support@vivid-wins.co.uk

Reference in HTML:
```html
<!-- Example: fetch from API -->
<script>
const fbUrl = process.env.FACEBOOK_PAGE_URL || 'https://www.facebook.com/people/VividWins/61572047675668/';
</script>
```

## 🚀 Deploying Updates

```bash
# Make changes
git add .
git commit -m "Update auction data"
git push

# Vercel automatically deploys on push to main
```

## 📧 Contact

**Email:** support@vivid-wins.co.uk  
**Facebook:** [Vivid Wins](https://www.facebook.com/people/VividWins/61572047675668/)

## 📄 License

© 2026 Vivid Wins. All rights reserved.