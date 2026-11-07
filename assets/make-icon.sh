mkdir -p assets
# Generate a simple SVG icon (used as placeholder; replace with real PNG for PWA)
cat > assets/icon-192.png.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#FF6B9D"/>
  <text x="96" y="130" font-size="100" text-anchor="middle">🛒</text>
</svg>
EOF
echo "Created assets placeholder"
