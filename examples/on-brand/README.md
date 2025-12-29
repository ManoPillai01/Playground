# On Brand Example

This example demonstrates the brand consistency checker feature.

## Quick Start

```bash
# From the repository root
cd examples/on-brand

# Check on-brand content
npm run agent brand check --profile ./brand-profile.json \
  --file ./content-samples/good-press-release.txt

# Check borderline content
npm run agent brand check --profile ./brand-profile.json \
  --file ./content-samples/borderline-social-post.txt

# Check off-brand content
npm run agent brand check --profile ./brand-profile.json \
  --file ./content-samples/bad-ad-copy.txt
```

## Files

- `brand-profile.json` - The brand profile defining values, voice, and rules
- `content-samples/` - Example content at different brand alignment levels
  - `good-press-release.txt` - On-brand press release
  - `borderline-social-post.txt` - Borderline social media post
  - `bad-ad-copy.txt` - Off-brand advertisement copy

## Expected Results

| Content | Expected Status | Key Issues |
|---------|----------------|------------|
| good-press-release.txt | On Brand | Aligns with professional voice and values |
| borderline-social-post.txt | Borderline | Slightly casual, could be more professional |
| bad-ad-copy.txt | Off Brand | Mentions competitors, uses fear-based messaging |

## API Usage

Start the brand check API server:

```bash
npm run agent brand serve --profile ./brand-profile.json --port 3000
```

Then make API requests:

```bash
curl -X POST http://localhost:3000/on-brand/check \
  -H "Content-Type: application/json" \
  -d '{"content": "Your content to check here"}'
```

## Brand Profile Structure

The brand profile includes:

- **values**: Core brand values (5-10 recommended)
- **voiceDescriptors**: How the brand sounds (e.g., "professional", "confident")
- **toneAcceptable**: Acceptable tone characteristics
- **toneUnacceptable**: Tone characteristics to avoid
- **neverRules**: Things the brand should never do/say
- **examples**: Canonical examples of good and bad brand content
