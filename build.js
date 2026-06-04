const fs = require('fs');
const path = require('path');
const https = require('https');

/* ============================
   CONFIG
   ============================ */
const CONFIG = {
  scriptUrl: process.env.APPS_SCRIPT_URL,
  siteUrl: process.env.SITE_URL || 'https://yourusername.github.io/blogs',
  distDir: './dist',
  postsDir: './dist/post'
};

/* ============================
   UTILITIES
   ============================ */

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const maxRedirects = 5;

    function request(targetUrl, redirectsLeft) {
      const client = targetUrl.startsWith('https:') ? https : require('http');

      client.get(targetUrl, { headers: { 'Accept': 'application/json' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects'));
            return;
          }
          console.log(`Following redirect to ${res.headers.location}`);
          request(res.headers.location, redirectsLeft - 1);
          return;
        }

        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`)));
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error(`Invalid JSON from Apps Script.\nFirst 500 chars:\n${data.slice(0, 500)}`));
          }
        });
      }).on('error', reject);
    }

    request(url, maxRedirects);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? (dateStr || '') : d.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/* ============================
   CSS
   ============================ */
const BASE_CSS = `:root{
  --bg:#fafaf9;
  --bg-warm:#f5f5f4;
  --surface:#ffffff;
  --text:#1c1917;
  --text-secondary:#57534e;
  --text-tertiary:#a8a29e;
  --accent-warm:#78716c;
  --border:#e7e5e4;
  --radius:16px;
  --radius-sm:10px;
  --accent-orange:#ff8c00;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  font-family:"Inter",-apple-system,sans-serif;
  background:var(--bg);
  color:var(--text);
  font-size:16px;
  line-height:1.65;
  -webkit-font-smoothing:antialiased;
}
.scroll-progress{
  position:fixed;
  top:0;left:0;
  height:2px;
  background:linear-gradient(90deg,var(--text),var(--accent-warm));
  z-index:9999;
  width:0%;
  will-change:width;
}
@keyframes fadeUp{
  from{opacity:0;transform:translate3d(0,30px,0)}
  to{opacity:1;transform:translate3d(0,0,0)}
}
@keyframes charReveal{
  from{opacity:0;transform:translate3d(0,20px,0)}
  to{opacity:1;transform:translate3d(0,0,0)}
}
@keyframes shimmer{
  0%{background-position:0% 50%}
  100%{background-position:200% 50%}
}
@keyframes scaleReveal{
  from{opacity:0;transform:scale(.92) translate3d(0,20px,0)}
  to{opacity:1;transform:scale(1) translate3d(0,0,0)}
}
.reveal{
  opacity:0;
  transform:translate3d(0,20px,0);
  transition:opacity .6s ease,transform .6s ease;
  will-change:opacity,transform;
}
.reveal.revealed{
  opacity:1;
  transform:translate3d(0,0,0)
}
.reveal-scale{
  opacity:0;
  transform:scale(.92) translate3d(0,20px,0);
  transition:opacity .7s ease,transform .7s ease;
  will-change:opacity,transform;
}
.reveal-scale.revealed{
  opacity:1;
  transform:scale(1) translate3d(0,0,0)
}
.stagger-1{transition-delay:.1s}
.stagger-2{transition-delay:.2s}
.stagger-3{transition-delay:.3s}
.stagger-4{transition-delay:.4s}
.stagger-5{transition-delay:.5s}
.stagger-6{transition-delay:.6s}
.site-header{
  background:var(--surface);
  border-bottom:1px solid var(--border);
  padding:16px 0;
  position:sticky;
  top:0;
  z-index:100;
}
.header-inner{
  max-width:1280px;
  margin:auto;
  padding:0 32px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.logo{
  font-size:20px;
  font-weight:800;
  color:var(--text);
  letter-spacing:-.3px;
}
.logo span{
  color:var(--accent-orange);
  background:linear-gradient(90deg,var(--accent-orange),#ffb347,var(--accent-orange));
  background-size:200% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:shimmer 4s linear infinite;
}
.main-nav{
  display:flex;
  gap:28px;
  align-items:center;
}
.main-nav a{
  color:var(--text-secondary);
  font-size:14px;
  font-weight:600;
  text-decoration:none;
  transition:color .2s ease;
  position:relative;
}
.main-nav a::after{
  content:'';
  position:absolute;
  bottom:-4px;
  left:0;
  width:0;
  height:1.5px;
  background:var(--text);
  transition:width .3s ease;
}
.main-nav a:hover{
  color:var(--text);
}
.main-nav a:hover::after{
  width:100%;
}
.nav-btn{
  background:var(--text);
  color:var(--bg);
  padding:10px 22px;
  border-radius:var(--radius-sm);
  font-weight:700;
  font-size:13px;
  text-decoration:none;
  transition:all .25s ease;
  letter-spacing:.3px;
}
.nav-btn:hover{
  transform:translate3d(0,-2px,0);
  background:var(--accent-warm);
  box-shadow:0 8px 24px rgba(0,0,0,.12);
}
.blog-hero{
  max-width:1280px;
  margin:0 auto;
  padding:80px 32px 50px;
  text-align:center;
}
.blog-hero h1{
  font-size:clamp(36px,5vw,64px);
  font-weight:400;
  letter-spacing:-.03em;
  line-height:1.1;
  margin-bottom:16px;
}
.blog-hero h1 .word{
  display:inline-block;
  overflow:hidden;
  margin-right:.2em;
}
.blog-hero h1 .word span{
  display:inline-block;
  animation:charReveal .5s ease both;
}
.blog-hero h1 .word:nth-child(1) span{animation-delay:.2s}
.blog-hero h1 .word:nth-child(2) span{animation-delay:.3s}
.blog-hero h1 strong{
  font-weight:500;
  color:var(--accent-warm);
}
.blog-hero p{
  max-width:560px;
  margin:0 auto;
  font-size:17px;
  color:var(--text-secondary);
  line-height:1.7;
  animation:fadeUp .6s ease .6s both;
}
.filters{
  max-width:1280px;
  margin:0 auto;
  padding:0 32px;
  display:flex;
  justify-content:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:40px;
}
.filter-btn{
  padding:10px 24px;
  background:var(--surface);
  border:1.5px solid var(--border);
  border-radius:100px;
  color:var(--text-secondary);
  font-size:13px;
  cursor:pointer;
  transition:all .3s ease;
  font-weight:600;
  font-family:inherit;
  letter-spacing:.3px;
}
.filter-btn:hover{
  border-color:var(--text-tertiary);
  color:var(--text);
  transform:translate3d(0,-2px,0);
}
.filter-btn.active{
  background:var(--text);
  border-color:var(--text);
  color:var(--bg);
  box-shadow:0 4px 16px rgba(0,0,0,.1);
}
.refresh-wrap{
  max-width:1280px;
  margin:0 auto 30px;
  padding:0 32px;
  text-align:center;
}
.refresh-btn{
  padding:8px 18px;
  background:var(--bg-warm);
  border:1.5px solid var(--border);
  border-radius:var(--radius-sm);
  color:var(--text-secondary);
  font-size:13px;
  cursor:pointer;
  transition:all .2s ease;
  font-family:inherit;
  font-weight:500;
}
.refresh-btn:hover{
  background:var(--surface);
  color:var(--text);
  border-color:var(--text-tertiary);
}
.blog-section{
  max-width:1280px;
  margin:0 auto;
  padding:0 32px 60px;
}
.blog-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:24px;
}
@media(max-width:1024px){
  .blog-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:640px){
  .blog-grid{grid-template-columns:1fr}
}
.blog-card{
  display:block;
  text-decoration:none;
  color:inherit;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:var(--radius);
  overflow:hidden;
  transition:all .5s cubic-bezier(0.16,1,0.3,1);
  cursor:pointer;
  position:relative;
  transform:translate3d(0,0,0);
}
.blog-card::before{
  content:'';
  position:absolute;
  top:0;left:0;right:0;
  height:3px;
  background:linear-gradient(90deg,var(--text),var(--accent-warm));
  transform:scaleX(0);
  transform-origin:left;
  transition:transform .6s ease;
  z-index:2;
}
.blog-card:hover::before{
  transform:scaleX(1);
}
.blog-card:hover{
  transform:translate3d(0,-8px,0);
  border-color:#d6d3d1;
  box-shadow:0 20px 60px rgba(0,0,0,.1);
}
.blog-img-wrap{
  width:100%;
  height:220px;
  overflow:hidden;
  position:relative;
  background:var(--bg-warm);
}
.blog-img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  transition:transform .6s ease;
}
.blog-card:hover .blog-img{
  transform:scale(1.08);
}
.blog-body{
  padding:28px;
}
.blog-meta{
  display:flex;
  gap:12px;
  align-items:center;
  margin-bottom:14px;
  font-size:12px;
  color:var(--text-tertiary);
  text-transform:uppercase;
  letter-spacing:1px;
  font-weight:500;
}
.blog-category{
  background:var(--text);
  color:var(--bg);
  padding:4px 12px;
  border-radius:20px;
  font-weight:700;
  font-size:10px;
  letter-spacing:.5px;
}
.blog-card h3{
  font-size:20px;
  font-weight:600;
  margin-bottom:10px;
  line-height:1.35;
  letter-spacing:-.3px;
  transition:color .2s ease;
}
.blog-card:hover h3{
  color:var(--accent-warm);
}
.blog-card p{
  color:var(--text-secondary);
  font-size:14px;
  line-height:1.65;
  margin-bottom:18px;
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
}
.read-more{
  color:var(--text);
  font-weight:700;
  font-size:13px;
  display:inline-flex;
  align-items:center;
  gap:6px;
  letter-spacing:.3px;
  transition:all .3s ease;
}
.read-more::after{
  content:"→";
  transition:transform .3s ease;
}
.blog-card:hover .read-more{
  color:var(--accent-orange);
}
.blog-card:hover .read-more::after{
  transform:translateX(4px);
}
.loading{
  text-align:center;
  padding:80px 20px;
  color:var(--text-tertiary);
  font-size:16px;
  grid-column:1 / -1;
}
.error{
  text-align:center;
  padding:60px 20px;
  color:#dc2626;
  font-size:16px;
  grid-column:1 / -1;
}
.error button{
  margin-top:16px;
  padding:12px 24px;
  background:var(--text);
  border:none;
  border-radius:var(--radius-sm);
  color:var(--bg);
  font-weight:700;
  cursor:pointer;
  transition:all .2s ease;
}
.error button:hover{
  background:var(--accent-warm);
  transform:translate3d(0,-2px,0);
}
.article-view{
  display:none;
  max-width:800px;
  margin:40px auto 80px;
  padding:0 32px;
  animation:fadeUp .6s ease both;
}
.article-view.active{
  display:block;
}
.back-btn{
  display:inline-flex;
  align-items:center;
  gap:8px;
  margin-bottom:32px;
  padding:10px 20px;
  background:var(--surface);
  border:1.5px solid var(--border);
  border-radius:var(--radius-sm);
  color:var(--text-secondary);
  font-size:14px;
  font-weight:600;
  cursor:pointer;
  transition:all .2s ease;
  font-family:inherit;
}
.back-btn:hover{
  border-color:var(--text-tertiary);
  color:var(--text);
  transform:translate3d(-4px,0,0);
}
.article-hero-img{
  width:100%;
  height:400px;
  object-fit:cover;
  border-radius:var(--radius);
  margin-bottom:40px;
  background:var(--bg-warm);
}
.article-header{
  margin-bottom:40px;
}
.article-header .blog-meta{
  margin-bottom:20px;
}
.article-header h1{
  font-size:clamp(28px,4vw,42px);
  font-weight:600;
  line-height:1.2;
  letter-spacing:-.5px;
}
.article-body{
  color:var(--text-secondary);
  font-size:17px;
  line-height:1.85;
}
.article-body p{
  margin-bottom:22px;
}
.article-body h2,
.article-body h3{
  color:var(--text);
  margin:40px 0 16px;
  font-weight:600;
  letter-spacing:-.3px;
}
.article-body h2{
  font-size:26px;
}
.article-body h3{
  font-size:21px;
}
.article-body ul{
  margin:20px 0 20px 32px;
}
.article-body li{
  margin-bottom:12px;
}
.article-body li::marker{
  color:var(--accent-orange);
}
.article-body strong{
  color:var(--text);
}
.site-footer{
  background:var(--bg-warm);
  border-top:1px solid var(--border);
  padding:40px 32px;
  text-align:center;
}
.site-footer p{
  color:var(--text-tertiary);
  font-size:13px;
  letter-spacing:.3px;
}
@media(max-width:768px){
  .header-inner{padding:0 20px}
  .main-nav a:not(.nav-btn){display:none}
  .blog-hero{padding:60px 20px 40px}
  .blog-hero h1{font-size:36px}
  .filters{padding:0 20px}
  .blog-section{padding:0 20px 40px}
  .article-view{padding:0 20px;margin-top:24px}
  .article-hero-img{height:240px}
  .article-header h1{font-size:28px}
}`;

/* ============================
   HTML SHELL GENERATOR
   ============================ */
function generatePage({ title, description, canonical, body, schema, cssPath }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google-site-verification" content="XDmMnuh219KZKMDFTBif5DikYNENP4zH7ttHjOOnF-U" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${cssPath}">
${schema ? `<script type="application/ld+json">${schema}</script>` : ''}
<base target="_blank">
</head>
<body>

<div class="scroll-progress" id="scrollProgress"></div>

<header class="site-header">
  <div class="header-inner">
    <div class="logo">Boiler<span>Health</span></div>
    <nav class="main-nav">
      <a href="./index.html">All Posts</a>
      <a href="https://boilerhealth.github.io/" class="nav-btn">Main Site</a>
    </nav>
  </div>
</header>

${body}

<footer class="site-footer">
  <p>© 2026 BoilerHealth. All Rights Reserved.</p>
</footer>

<script>
(function(){
  const p = document.getElementById('scrollProgress');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if(!ticking){
      requestAnimationFrame(() => {
        p.style.width = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100 + '%';
        ticking = false;
      });
      ticking = true;
    }
  }, {passive:true});
})();
</script>

</body>
</html>`;
}

/* ============================
   DYNAMIC POST RENDERER JS
   ============================ */
function generatePostRendererJS(scriptUrl) {
  return `<script>
(function(){
  const SCRIPT_URL = '${scriptUrl.replace(/'/g, "\'")}';

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d) ? (dateStr || '') : d.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function slugify(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  async function loadPost() {
    const path = window.location.pathname;
    const match = path.match(/\/post\/(.+)\.html?$/);
    const targetSlug = match ? match[1] : '';
    const container = document.getElementById('articleView');

    if (!targetSlug) {
      container.innerHTML = '<div class="error">No post specified.<br><button onclick="history.back()">Go Back</button></div>';
      return;
    }

    try {
      const res = await fetch(SCRIPT_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const posts = await res.json();
      if (!Array.isArray(posts)) throw new Error('Invalid data');
      const post = posts.find(function(p){ return slugify(p.title) === targetSlug; });
      if (!post) throw new Error('Post not found');

      document.title = escapeHtml(post.title) + ' | BoilerHealth Blogs';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.content = escapeHtml(post.excerpt);

      container.innerHTML =
        '<button class="back-btn" onclick="location.href=\'../index.html\'">← Back to all posts</button>' +
        '<img class="article-hero-img" src="' + (post.image || '') + '" alt="' + escapeHtml(post.title) + '">' +
        '<div class="article-header">' +
          '<div class="blog-meta">' +
            '<span class="blog-category">' + escapeHtml(post.category) + '</span>' +
            '<span>' + formatDate(post.date) + '</span>' +
          '</div>' +
          '<h1>' + escapeHtml(post.title) + '</h1>' +
        '</div>' +
        '<div class="article-body">' +
          (post.content || post.processedContent || '<p>No content.</p>') +
        '</div>';
    } catch (err) {
      container.innerHTML = '<div class="error">Failed to load post.<br><button onclick="loadPost()">Retry</button></div>';
      console.error(err);
    }
  }

  loadPost();
})();
</script>`;
}

/* ============================
   BUILD
   ============================ */
async function build() {
  if (!CONFIG.scriptUrl) {
    throw new Error('APPS_SCRIPT_URL environment variable is missing. Did you add the secret in Settings > Secrets and variables > Actions?');
  }

  // Clean / create dist
  if (fs.existsSync(CONFIG.distDir)) {
    fs.rmSync(CONFIG.distDir, { recursive: true });
  }
  fs.mkdirSync(CONFIG.postsDir, { recursive: true });

  // Write CSS
  fs.writeFileSync(path.join(CONFIG.distDir, 'style.css'), BASE_CSS);

  // Fetch posts
  console.log('Fetching posts from Apps Script...');
  console.log('URL:', CONFIG.scriptUrl.slice(0, 60) + '...');

  const posts = await fetchJson(CONFIG.scriptUrl);

  if (!Array.isArray(posts)) {
    throw new Error('Expected array from Apps Script, got: ' + typeof posts + '\nData: ' + JSON.stringify(posts).slice(0, 200));
  }

  const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  console.log(`Fetched ${sortedPosts.length} posts`);

  /* Add slug to each post */
  sortedPosts.forEach(post => {
    post.slug = slugify(post.title);
  });

  const scriptUrlSafe = CONFIG.scriptUrl.replace(/'/g, "\'");

  /* ---------- INDEX PAGE (DYNAMIC) ---------- */
  const indexBody = `
<div class="blog-hero">
  <h1>
    <span class="word"><span>BoilerHealth</span></span>
    <span class="word"><span><strong>Blogs</strong></span></span>
  </h1>
  <p>Keep your boiler running efficiently all year round.</p>
</div>

<div class="filters">
  <button class="filter-btn active" onclick="filterPosts('all')">All Posts</button>
  <button class="filter-btn" onclick="filterPosts('Maintenance')">Maintenance</button>
  <button class="filter-btn" onclick="filterPosts('Safety')">Safety</button>
  <button class="filter-btn" onclick="filterPosts('Tips')">Tips</button>
  <button class="filter-btn" onclick="filterPosts('News')">News</button>
</div>

<div class="refresh-wrap">
  <button class="refresh-btn" onclick="location.reload()">↻ Refresh Posts</button>
</div>

<div class="blog-section">
  <div id="blogGrid" class="blog-grid">
    <div class="loading">Loading posts...</div>
  </div>
</div>

<script>
(function(){
  const SCRIPT_URL = '${scriptUrlSafe}';
  let allPosts = [];

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d) ? (dateStr || '') : d.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function slugify(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  }

  function renderPosts(posts) {
    const grid = document.getElementById('blogGrid');
    if (!posts.length) {
      grid.innerHTML = '<div class="loading">No posts yet.</div>';
      return;
    }
    grid.innerHTML = posts.map(function(post, idx){
      return '<a href="post/' + post.slug + '.html" class="blog-card reveal-scale revealed stagger-' + Math.min(idx % 6 + 1, 6) + '">' +
        '<div class="blog-img-wrap">' +
          '<img class="blog-img" src="' + (post.image || '') + '" alt="' + escapeHtml(post.title) + '" onerror="this.style.display=\'none\'">' +
        '</div>' +
        '<div class="blog-body">' +
          '<div class="blog-meta">' +
            '<span class="blog-category">' + escapeHtml(post.category) + '</span>' +
            '<span>' + formatDate(post.date) + '</span>' +
          '</div>' +
          '<h3>' + escapeHtml(post.title) + '</h3>' +
          '<p>' + escapeHtml(post.excerpt) + '</p>' +
          '<span class="read-more">Read Article →</span>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  async function loadPosts() {
    const grid = document.getElementById('blogGrid');
    grid.innerHTML = '<div class="loading">Loading posts...</div>';
    try {
      const res = await fetch(SCRIPT_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const posts = await res.json();
      if (!Array.isArray(posts)) throw new Error('Invalid data');
      allPosts = posts.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      allPosts.forEach(function(p){ p.slug = slugify(p.title); });
      renderPosts(allPosts);
    } catch (err) {
      grid.innerHTML = '<div class="error">Failed to load posts.<br><button onclick="loadPosts()">Retry</button></div>';
      console.error(err);
    }
  }

  window.filterPosts = function(category) {
    document.querySelectorAll('.filter-btn').forEach(function(btn){ btn.classList.remove('active'); });
    if (event && event.target) event.target.classList.add('active');
    const filtered = category === 'all' ? allPosts : allPosts.filter(function(p){ return p.category === category; });
    renderPosts(filtered);
  };

  loadPosts();
})();
</script>
`;

  const indexSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "BoilerHealth Blogs",
    "description": "Expert boiler maintenance tips, safety guides, and efficiency advice.",
    "url": CONFIG.siteUrl + '/index.html',
    "blogPost": sortedPosts.map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "image": post.image || undefined,
      "datePublished": post.date,
      "url": `${CONFIG.siteUrl}/post/${post.slug}.html`,
      "articleSection": post.category
    }))
  }, null, 2);

  fs.writeFileSync(
    path.join(CONFIG.distDir, 'index.html'),
    generatePage({
      title: 'BoilerHealth Blogs | Tips, Maintenance & Safety',
      description: 'Expert boiler maintenance tips, safety guides, and efficiency advice from BoilerHealth.',
      canonical: CONFIG.siteUrl + '/index.html',
      body: indexBody,
      schema: indexSchema,
      cssPath: './style.css'
    })
  );

  /* ---------- INDIVIDUAL POST PAGES (DYNAMIC) ---------- */
  const postRenderer = generatePostRendererJS(CONFIG.scriptUrl);

  for (const post of sortedPosts) {
    const postBody = `
<div class="article-view active" id="articleView" style="display:block;">
  <div class="loading">Loading post...</div>
</div>
${postRenderer}
`;

    const postSchema = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt,
      "image": post.image || undefined,
      "datePublished": post.date,
      "dateModified": post.date,
      "author": { "@type": "Organization", "name": "BoilerHealth" },
      "publisher": {
        "@type": "Organization",
        "name": "BoilerHealth",
        "logo": { "@type": "ImageObject", "url": "https://boilerhealth.com/logo.png" }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `${CONFIG.siteUrl}/post/${post.slug}.html`
      }
    }, null, 2);

    const postPath = path.join(CONFIG.postsDir, `${post.slug}.html`);
    fs.writeFileSync(
      postPath,
      generatePage({
        title: `${post.title} | BoilerHealth Blogs`,
        description: post.excerpt,
        canonical: `${CONFIG.siteUrl}/post/${post.slug}.html`,
        body: postBody,
        schema: postSchema,
        cssPath: '../style.css'
      })
    );
    console.log(`  Wrote post: ${post.slug}.html`);
  }

  /* ---------- 404.HTML (CATCH-ALL FOR NEW POSTS) ---------- */
  const notFoundBody = `
<div class="article-view active" id="articleView" style="display:block;">
  <div class="loading">Loading post...</div>
</div>
${postRenderer}
<script>
(function(){
  const path = window.location.pathname;
  if (!path.match(/\/post\/(.+)\.html?$/)) {
    document.getElementById('articleView').innerHTML =
      '<div class="error" style="padding-top:120px">' +
      '<h2 style="color:var(--text);margin-bottom:16px">Page Not Found</h2>' +
      '<p>The page you are looking for does not exist.</p>' +
      '<button class="back-btn" style="margin-top:24px" onclick="location.href=\'./index.html\'">← Back to all posts</button>' +
      '</div>';
  }
})();
</script>
`;

  fs.writeFileSync(
    path.join(CONFIG.distDir, '404.html'),
    generatePage({
      title: 'BoilerHealth Blogs',
      description: 'Page not found.',
      canonical: CONFIG.siteUrl + '/404.html',
      body: notFoundBody,
      schema: '',
      cssPath: './style.css'
    })
  );
  console.log('  Wrote 404.html (catch-all for new posts)');

  /* ---------- SITEMAP.XML ---------- */
  function formatSitemapDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const d = new Date(dateStr);
    return isNaN(d) ? String(dateStr).slice(0, 10) : d.toISOString().split('T')[0];
  }

  const baseUrl = CONFIG.siteUrl.replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/index.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>${sortedPosts.map(post => `
  <url>
    <loc>${baseUrl}/post/${post.slug}.html</loc>
    <lastmod>${formatSitemapDate(post.date)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

  fs.writeFileSync(path.join(CONFIG.distDir, 'sitemap.xml'), sitemap);

  /* ---------- ROBOTS.TXT ---------- */
  const robots = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
Host: ${baseUrl}`;

  fs.writeFileSync(path.join(CONFIG.distDir, 'robots.txt'), robots);

  console.log(`✅ Build complete:
  - ${sortedPosts.length} post pages with title-based URLs (post/slug.html)
  - 1 dynamic index page (fetches live posts)
  - 404.html (catch-all for new posts added after build)
  - sitemap.xml (${sortedPosts.length + 1} URLs)
  - robots.txt
  - style.css

New posts added to your Sheet after this build will work instantly via 404.html,
while existing posts have real files for fast SEO-friendly loading.`);
}

build().catch(err => {
  console.error('Build failed:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
