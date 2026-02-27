# @chris-lally/fumadocs

Fumadocs-focused UI helpers and integrations.

## Install

```bash
pnpm add @chris-lally/fumadocs
```

## Current exports

- `SidebarHistoryBanner`

## Usage

```tsx
import { SidebarHistoryBanner } from "@chris-lally/fumadocs";
```

Use with Fumadocs `DocsLayout`:

```tsx
<DocsLayout sidebar={{ banner: <SidebarHistoryBanner basePath="/dashboard" /> }} />
```

## License

MIT. See `LICENSE`.
