# On Brand Crew

A CrewAI-powered agent for brand consistency checking. Evaluates content against your brand profile to answer: **"Is this on brand?"**

## Features

- **CrewAI Integration**: Full multi-agent crew with brand analyst, content reviewer, and audit recorder
- **Standalone Tools**: Use brand checking tools directly without the full crew
- **CLI Interface**: Command-line tool for quick checks
- **API Server**: HTTP server compatible with the main On Brand API
- **Batch Processing**: Check multiple files at once

## Installation

```bash
# From the packages/crewai-agent directory
pip install -e .

# Or install with dev dependencies
pip install -e ".[dev]"
```

## Quick Start

### 1. Create a Brand Profile

Create a `brand-profile.json` file:

```json
{
  "name": "My Brand",
  "version": "1.0.0",
  "values": ["Quality", "Innovation", "Trust"],
  "voiceDescriptors": ["professional", "friendly", "clear"],
  "toneAcceptable": ["helpful", "encouraging"],
  "toneUnacceptable": ["aggressive", "condescending"],
  "neverRules": ["competitor names", "profanity"],
  "examples": [
    {"content": "We help you succeed with innovative solutions.", "type": "good"},
    {"content": "Our competitors are terrible!", "type": "bad"}
  ]
}
```

### 2. Check Content

**CLI:**
```bash
# Direct content check
on-brand-crew check "Your marketing copy here" -p ./brand-profile.json

# From file
on-brand-crew check -f content.txt -p ./brand-profile.json

# JSON output
on-brand-crew check "Content" -p ./brand-profile.json --json
```

**Python:**
```python
from on_brand_crew import SimpleBrandChecker

checker = SimpleBrandChecker("./brand-profile.json")
result = checker.check("Your content here")

print(result["statusDisplay"])  # "On Brand ✅"
print(result["explanations"])   # List of explanation bullets
print(result["confidence"])     # 0-100 confidence score
```

### 3. Use the Full CrewAI Crew

For more sophisticated analysis with multiple agents:

```python
from on_brand_crew import OnBrandCrew

crew = OnBrandCrew("./brand-profile.json")
result = crew.check("Your content here")
```

## CLI Commands

### `on-brand-crew check`

Check content for brand consistency.

```bash
on-brand-crew check [content] [options]

Options:
  -f, --file FILE      Read content from file
  -p, --profile PATH   Path to brand profile (default: ./brand-profile.json)
  -t, --type TYPE      Content type hint (ad-copy, social-post, etc.)
  --crew               Use full CrewAI crew (slower, more detailed)
  --json               Output as JSON
```

### `on-brand-crew batch`

Check multiple files in a directory.

```bash
on-brand-crew batch -d ./content/ -p ./brand-profile.json

Options:
  -d, --dir DIR        Directory containing content files
  -p, --profile PATH   Path to brand profile
  --json               Output as JSON
```

### `on-brand-crew serve`

Start an HTTP API server.

```bash
on-brand-crew serve -p ./brand-profile.json --port 3001

Options:
  -p, --profile PATH   Path to brand profile
  --port PORT          Server port (default: 3001)
  --host HOST          Server host (default: localhost)
```

## API Reference

### SimpleBrandChecker

Quick brand checking without the full crew overhead.

```python
from on_brand_crew import SimpleBrandChecker

checker = SimpleBrandChecker("./brand-profile.json")

# Single check
result = checker.check("Content to check", content_type="ad-copy")

# Batch check
results = checker.check_batch(["Content 1", "Content 2", "Content 3"])

# Get summary
summary = checker.get_summary(results)
print(f"Health Score: {summary['health_score']}%")
```

### OnBrandCrew

Full CrewAI crew with multiple agents.

```python
from on_brand_crew import OnBrandCrew

crew = OnBrandCrew("./brand-profile.json")

# Single check (runs brand analyst agent)
result = crew.check("Content to check")

# Batch check with summary
result = crew.check_batch(["Content 1", "Content 2"])
```

### Custom Tools

Use individual tools in your own CrewAI agents:

```python
from crewai import Agent
from on_brand_crew.tools import (
    BrandCheckerTool,
    CheckNeverRulesTool,
    CheckToneTool,
    CheckValueAlignmentTool,
)

# Add tools to your agent
my_agent = Agent(
    role="Content Reviewer",
    goal="Review content for brand consistency",
    tools=[
        BrandCheckerTool(),
        CheckNeverRulesTool(),
        CheckToneTool(),
    ],
)
```

## Response Format

```python
{
    "status": "on-brand",           # on-brand | borderline | off-brand
    "statusDisplay": "On Brand ✅",
    "explanations": [
        {
            "text": "Content reflects brand values: Quality, Innovation",
            "aspect": "value",
            "severity": "info"
        }
    ],
    "confidence": 85,               # 0-100
    "profileVersion": "1.0.0",
    "checkedAt": "2024-01-15T10:30:00Z",
    "contentHash": "a1b2c3...",
    "details": {
        "neverRuleViolations": [],
        "unacceptableToneFound": [],
        "valueAlignmentScore": 0.67,
        "voiceAlignmentScore": 0.5,
        "exampleSimilarity": {"good": 0.3, "bad": 0.0}
    }
}
```

## Agent Architecture

The OnBrandCrew consists of three agents:

| Agent | Role | Purpose |
|-------|------|---------|
| **Brand Analyst** | Brand Consistency Analyst | Evaluates content against brand guidelines |
| **Content Reviewer** | Content Quality Reviewer | Provides supplementary quality analysis |
| **Audit Recorder** | Brand Audit Recorder | Maintains audit trail of all checks |

## Integration with Node.js API

The CrewAI agent can run alongside the Node.js API server:

```bash
# Node.js API (port 3000)
npm run agent brand serve --port 3000 --ui

# Python CrewAI API (port 3001)
on-brand-crew serve --port 3001
```

Both servers use the same brand profile format and return compatible responses.

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy src/
```

## License

MIT

---

Built with [CrewAI](https://www.crewai.com/) - The Leading Multi-Agent Platform
