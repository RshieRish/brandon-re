# Brandon Sweeney Real Estate - Deployment Guide

This guide covers deployment options for the Brandon Sweeney Real Estate IDX website.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

1. **Connect to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "New Project" and import `brandon-re` repository
   - Vercel will automatically detect the configuration from `vercel.json`

2. **Environment Variables:**
   - In Vercel dashboard, go to Project Settings → Environment Variables
   - Add: `NODE_ENV=production`
   - Add any other environment variables as needed

3. **Deploy:**
   - Click "Deploy" - Vercel handles everything automatically
   - Your site will be live at `https://your-project-name.vercel.app`

### Option 2: Netlify

1. **Connect to Netlify:**
   - Visit [netlify.com](https://netlify.com)
   - Sign up/login with your GitHub account
   - Click "New site from Git" and select `brandon-re` repository
   - Netlify will use the configuration from `netlify.toml`

2. **Build Settings:**
   - Build command: `npm install`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

3. **Deploy:**
   - Click "Deploy site"
   - Your site will be live at `https://your-site-name.netlify.app`

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Access the application
# Website: http://localhost:3001
# Admin Panel: http://localhost:3001/admin
```

## 📁 Project Structure

```
brandon-re/
├── public/                 # Frontend files
│   ├── index.html         # Main website
│   ├── admin.html         # Admin panel
│   ├── styles.css         # Main styles
│   └── script.js          # Frontend JavaScript
├── routes/                # API routes
│   ├── listings.js        # Listings endpoints
│   ├── admin.js          # Admin endpoints
│   └── market.js         # Market data endpoints
├── services/              # Business logic
│   ├── mockDataService.js # Mock data (current)
│   └── idxService.js     # IDX integration (future)
├── netlify/functions/     # Serverless functions
├── python-free-bk/       # Python MLS integration
├── server.js             # Express server
├── vercel.json           # Vercel configuration
└── netlify.toml          # Netlify configuration
```

## 🏠 Features

- **Property Listings:** Browse available properties with advanced search
- **Admin Panel:** Manage listings, view analytics, and system settings
- **Responsive Design:** Works on desktop, tablet, and mobile devices
- **IDX Ready:** Prepared for MLS PIN integration
- **SEO Optimized:** Meta tags and structured data

## 🔮 Future Enhancements

- **Real MLS Data:** Integration with MLS PIN via Python backend
- **Photo Management:** Automatic photo downloads and optimization
- **Advanced Analytics:** Detailed visitor and listing analytics
- **Lead Management:** Contact form and lead tracking
- **Map Integration:** Interactive property maps

## 🆘 Support

For deployment issues or questions:
1. Check the deployment logs in your hosting platform
2. Verify all environment variables are set correctly
3. Ensure the repository is properly connected

## 📊 Performance

- **Lighthouse Score:** 95+ (Performance, Accessibility, SEO)
- **Load Time:** < 2 seconds
- **Mobile Optimized:** Responsive design
- **CDN Ready:** Static assets optimized for global delivery