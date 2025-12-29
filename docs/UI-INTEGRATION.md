# On Brand UI Integration Guide

This guide covers all the ways to integrate the brand consistency checker into your user interface.

## Quick Start

### Option 1: Built-in Web UI

The fastest way to get started - just add the `--ui` flag:

```bash
agent brand serve --profile ./brand-profile.json --ui
```

Open `http://localhost:3000` in your browser.

### Option 2: API Integration

Use the REST API from any frontend:

```javascript
const response = await fetch('http://localhost:3000/on-brand/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Your content here' })
});
const result = await response.json();
console.log(result.statusDisplay); // "On Brand ✅"
```

### Option 3: JavaScript SDK

Use our SDK for a better developer experience:

```html
<script src="http://localhost:3000/on-brand-sdk.js"></script>
<script>
  const client = new OnBrandClient('http://localhost:3000');
  const result = await client.check('Your content here');
</script>
```

---

## Integration Patterns

### Pattern 1: Paste + Check (Recommended for Teams)

**Best for:** Marketing teams, content reviewers, editorial workflows

The core user story: paste content, get instant feedback.

```html
<!DOCTYPE html>
<html>
<head>
  <title>Brand Checker</title>
</head>
<body>
  <div id="brand-widget"></div>

  <script src="http://localhost:3000/on-brand-sdk.js"></script>
  <script>
    new OnBrandWidget('#brand-widget', {
      apiUrl: 'http://localhost:3000',
      theme: 'light',
      onResult: (result) => {
        console.log('Brand check complete:', result.status);
      }
    });
  </script>
</body>
</html>
```

### Pattern 2: Inline Validation (CMS Integration)

**Best for:** Publishing platforms, CMS systems, form validation

Check content before publishing:

```javascript
// React example
function ContentEditor() {
  const [content, setContent] = useState('');
  const [brandStatus, setBrandStatus] = useState(null);
  const client = new OnBrandClient('http://localhost:3000');

  const handleCheck = async () => {
    const result = await client.check(content, {
      contentType: 'ad-copy'
    });
    setBrandStatus(result);
  };

  return (
    <div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <button onClick={handleCheck}>Check Brand</button>

      {brandStatus && (
        <div className={`status ${brandStatus.status}`}>
          {brandStatus.statusDisplay}
          <ul>
            {brandStatus.explanations.map((e, i) => (
              <li key={i}>{e.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Pre-publish Gate

**Best for:** Preventing off-brand content from being published

```javascript
async function publishContent(content) {
  const client = new OnBrandClient('http://localhost:3000');
  const result = await client.check(content);

  if (result.status === 'off-brand') {
    throw new Error(`Cannot publish: ${result.explanations[0].text}`);
  }

  if (result.status === 'borderline') {
    const proceed = confirm(
      `Warning: Content is borderline.\n\n` +
      `${result.explanations.map(e => e.text).join('\n')}\n\n` +
      `Publish anyway?`
    );
    if (!proceed) return;
  }

  // Proceed with publishing
  await submitToPublishingSystem(content);
}
```

### Pattern 4: Real-time Feedback

**Best for:** Writing assistants, AI content generators

Check as the user types (with debounce):

```javascript
const client = new OnBrandClient('http://localhost:3000');
let debounceTimer;

document.getElementById('content').addEventListener('input', (e) => {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const result = await client.check(e.target.value);
    updateStatusIndicator(result);
  }, 500); // Check 500ms after user stops typing
});

function updateStatusIndicator(result) {
  const indicator = document.getElementById('status');
  indicator.className = result.status;
  indicator.textContent = result.statusDisplay;
}
```

### Pattern 5: Batch Checking

**Best for:** Content audits, bulk validation

```javascript
async function checkMultipleContent(items) {
  const client = new OnBrandClient('http://localhost:3000');

  const results = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      content: item.content,
      result: await client.check(item.content)
    }))
  );

  // Summarize results
  const summary = {
    onBrand: results.filter(r => r.result.status === 'on-brand').length,
    borderline: results.filter(r => r.result.status === 'borderline').length,
    offBrand: results.filter(r => r.result.status === 'off-brand').length,
  };

  return { results, summary };
}
```

---

## SDK Reference

### OnBrandClient

The API client for making brand check requests.

```javascript
const client = new OnBrandClient(baseUrl, options);
```

**Constructor Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeout` | number | 5000 | Request timeout in milliseconds |
| `headers` | object | {} | Additional headers to send |

**Methods:**

#### `client.check(content, options)`

Check content for brand consistency.

```javascript
const result = await client.check('Your content', {
  contentType: 'ad-copy',  // optional
  metadata: { campaign: 'summer-2024' }  // optional
});
```

**Response:**
```javascript
{
  status: 'on-brand' | 'borderline' | 'off-brand',
  statusDisplay: 'On Brand ✅',
  explanations: [
    { text: 'Content aligns with brand values', severity: 'info', aspect: 'value' }
  ],
  confidence: 85,
  profileVersion: '1.0.0',
  checkedAt: '2024-01-15T10:30:00.000Z',
  contentHash: 'sha256:...'
}
```

#### `client.health()`

Check API health and get profile info.

```javascript
const health = await client.health();
// { status: 'ok', profile: { name: 'My Brand', version: '1.0.0' } }
```

### OnBrandWidget

An embeddable UI widget for brand checking.

```javascript
const widget = new OnBrandWidget(container, options);
```

**Constructor Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | 'http://localhost:3000' | API server URL |
| `mode` | string | 'inline' | Widget mode: 'inline' or 'floating' |
| `theme` | string | 'light' | Theme: 'light' or 'dark' |
| `placeholder` | string | 'Paste your content...' | Textarea placeholder |
| `buttonText` | string | 'Check Brand' | Button text |
| `onResult` | function | - | Callback when result is received |
| `onError` | function | console.error | Callback when error occurs |

**Methods:**

```javascript
widget.check();              // Trigger a brand check
widget.setContent('text');   // Set content programmatically
widget.getContent();         // Get current content
widget.destroy();            // Remove the widget
```

---

## API Reference

### POST /on-brand/check

Check content for brand consistency.

**Request:**
```json
{
  "content": "Your content to check",
  "contentType": "ad-copy",
  "metadata": {
    "campaign": "summer-2024"
  }
}
```

**Response:**
```json
{
  "status": "on-brand",
  "statusDisplay": "On Brand ✅",
  "explanations": [
    {
      "text": "Content aligns with brand values: Quality, Innovation",
      "aspect": "value",
      "severity": "info"
    }
  ],
  "confidence": 85,
  "profileVersion": "1.0.0",
  "checkedAt": "2024-01-15T10:30:00.000Z",
  "contentHash": "a1b2c3d4..."
}
```

**Content Types:**
- `ad-copy` - Advertisement copy
- `social-post` - Social media posts
- `influencer-script` - Influencer content
- `press-release` - Press releases
- `campaign-name` - Campaign names
- `email` - Email content
- `website` - Website copy
- `ai-generated` - AI-generated content
- `other` - Other content types

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "profile": {
    "name": "My Brand",
    "version": "1.0.0"
  }
}
```

---

## Best Practices

### 1. UX Guidelines

- **Response time < 2 seconds** - Users expect instant feedback
- **Clear status indicators** - Use color and emoji for quick recognition
- **Short explanations** - 1-3 bullets, focus on "why" not "how to fix"
- **Non-blocking** - Don't prevent users from proceeding, just inform

### 2. Error Handling

```javascript
const client = new OnBrandClient('http://localhost:3000', {
  timeout: 5000
});

try {
  const result = await client.check(content);
  handleResult(result);
} catch (error) {
  if (error.message === 'Request timeout') {
    showWarning('Brand check timed out. Content not validated.');
  } else if (error.status === 400) {
    showError('Invalid content format');
  } else {
    showError('Brand check unavailable');
  }
}
```

### 3. Caching Considerations

The API doesn't cache results - same content always gets re-checked. If you need caching:

```javascript
const cache = new Map();

async function checkWithCache(content) {
  const hash = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(content));
  const key = Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  if (cache.has(key)) {
    return cache.get(key);
  }

  const result = await client.check(content);
  cache.set(key, result);

  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(key), 5 * 60 * 1000);

  return result;
}
```

### 4. Accessibility

The built-in widget includes:
- Keyboard shortcut: `Ctrl/Cmd + Enter` to check
- ARIA labels for screen readers
- High contrast status indicators
- Focus management

For custom implementations, ensure:
- Status changes are announced to screen readers
- Color is not the only indicator (use text + icons)
- All interactive elements are keyboard accessible

---

## Deployment

### Production Checklist

1. **Set appropriate CORS headers** for your domains
2. **Use HTTPS** in production
3. **Set up monitoring** for the `/health` endpoint
4. **Configure rate limiting** if needed
5. **Back up brand profiles** - they're your source of truth

### Docker Example

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "packages/cli/dist/index.js", "brand", "serve", "--ui", "--host", "0.0.0.0"]
```

### Environment Variables

```bash
# Server configuration
PORT=3000
HOST=0.0.0.0

# Profile location
BRAND_PROFILE=/app/config/brand-profile.json
```

---

## Troubleshooting

### "Disconnected" Status in UI

1. Check if the server is running: `curl http://localhost:3000/health`
2. Verify CORS if accessing from different origin
3. Check browser console for network errors

### Slow Response Times

1. Profile complexity affects speed - simplify if needed
2. Check server resources (CPU, memory)
3. Consider running multiple instances behind a load balancer

### Inconsistent Results

The brand checker is deterministic - same input always produces same output. If you see different results:
1. Check if the brand profile was modified
2. Verify you're sending the exact same content (whitespace matters)
3. Check the `profileVersion` in responses

---

## Examples Repository

See `/examples/on-brand/` for complete working examples:

- `brand-profile.json` - Sample brand profile
- `content-samples/` - Example content at different brand alignment levels
- `README.md` - Quick start guide
