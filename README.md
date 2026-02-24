# AI Search Demo UI

A modern, performant chat interface powered by Cloudflare AI Search. Built with SvelteKit, TypeScript, and Tailwind CSS.

## Features

- **Real-time Chat Interface**: Clean, responsive chat UI with markdown support for AI responses
- **AI-Powered Search**: Leverages Cloudflare AI Search for intelligent query processing
- **Performance Optimized**: Uses `requestAnimationFrame` for smooth scrolling, efficient state management
- **Type Safe**: Full TypeScript support with strict type checking
- **Error Handling**: Comprehensive error handling with timeout protection and graceful fallbacks
- **Markdown Rendering**: AI responses rendered with full markdown support including code blocks, tables, and formatting

## Tech Stack

- **Framework**: [SvelteKit](https://kit.svelte.dev/) - Modern web framework with server-side rendering
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **UI Components**: [shadcn-svelte](https://www.shadcn-svelte.com/) - High-quality component library
- **Icons**: [Lucide Svelte](https://lucide.dev/) - Beautiful icon set
- **Markdown**: [marked](https://marked.js.org/) - Markdown parser and renderer
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/) - Serverless edge computing

## Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) CLI
- Cloudflare account with:
  - AI Search instance configured
  - Workers enabled

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy the example configuration:

```bash
cp wrangler.jsonc_example wrangler.jsonc
```

Edit `wrangler.jsonc` and add your Cloudflare credentials:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "demo-ui",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2026-02-24",
  "compatibility_flags": ["nodejs_compat", "nodejs_als"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".svelte-kit/cloudflare",
  },
  "observability": {
    "enabled": true,
  },
  "ai": {
    "binding": "AI",
  },
  "vars": {
    "AI_SEARCH_ID": "your-ai-search-id-here",
  },
}
```

**Note**: `wrangler.jsonc` is gitignored for security. Use `wrangler.jsonc_example` as a template.

## Development

### Start Development Server

```bash
bun run dev
```

Opens at `http://localhost:5173` by default.

### Type Checking

```bash
bun run check
```

Watch mode:

```bash
bun run check:watch
```

### Generate Cloudflare Types

```bash
bun run cf-typegen
```

Updates `src/worker-configuration.d.ts` with your Cloudflare bindings.

## Building

### Build for Production

```bash
bun run build
```

Generates optimized output in `.svelte-kit/cloudflare/`.

### Preview Production Build

```bash
bun run preview
```

Runs the production build locally via Wrangler.

### Deploy to Cloudflare

```bash
bun run deploy
```

Deploys to your Cloudflare Workers environment.

## Project Structure

```
src/
├── routes/
│   ├── +page.svelte           # Main chat interface
│   ├── +page.server.ts        # Page server load
│   └── api/
│       └── chat/
│           └── +server.ts     # Chat API endpoint
├── lib/
│   ├── components/            # Reusable UI components
│   ├── assets/                # Static assets
│   └── utils.ts               # Utility functions
├── app.html                   # HTML template
├── app.css                    # Global styles
└── app.d.ts                   # Type definitions
```

## API Endpoints

### POST `/api/chat`

Sends a message to the AI and receives a response.

**Request**:

```typescript
{
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
  }>;
}
```

**Response**:

```typescript
{
  reply: string;
}
```

**Error Responses**:

- `400`: Invalid request body or messages array
- `500`: Server configuration or internal error
- `502`: No response from AI service
- `504`: Request timeout

## Performance Optimizations

- **Scroll Performance**: Uses `requestAnimationFrame` instead of `setTimeout` for smooth animations
- **Derived State**: Leverages Svelte 5's `$derived` for computed values
- **Native AI Binding**: Uses Cloudflare's native Workers AI binding for optimal performance and reliability
- **Environment Validation**: Upfront validation of required environment variables
- **Efficient Rendering**: Conditional rendering to avoid unnecessary DOM updates

## Code Safety Features

- **Type Safety**: Strict TypeScript with full type coverage
- **Input Validation**: Request body and environment variable validation
- **Error Handling**: Comprehensive try-catch with specific error types
- **Optional Chaining**: Safe property access with `?.` operator
- **Null Checks**: Defensive null/undefined checks throughout

## Readability Improvements

- **Clear Function Names**: Descriptive, self-documenting function names
- **Helper Functions**: Extracted logic into focused, reusable functions
- **Minimal Logging**: Removed excessive debug logs for cleaner output
- **Consistent Formatting**: Uniform code style and structure
- **Comments**: Strategic comments only where logic isn't self-evident

## Troubleshooting

### "AI binding not found"

Ensure `wrangler.jsonc` has the `ai` binding configured and you've run `bun run cf-typegen`.

### "Messages are required"

The chat API requires a non-empty messages array. Ensure the client is sending at least one message.

### Request Timeout

If requests consistently timeout, check:

- Network connectivity
- Cloudflare AI Search instance status
- Request payload size

### Build Errors

Run `bun run check` to identify TypeScript errors before building.

## Contributing

When making changes:

1. Run `bun run check` to verify types
2. Test locally with `bun run dev`
3. Build and preview with `bun run preview`
4. Deploy with `bun run deploy`

## License

MIT
