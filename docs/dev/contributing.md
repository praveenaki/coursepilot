# Contributing to CoursePilot

Thank you for your interest in contributing to CoursePilot! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Chrome browser (for development and testing)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone <your-fork-url>
   cd coursepilot
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

This opens a Chrome window with the extension loaded. Changes are hot-reloaded.

## Development Workflow

### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes
3. Run type checking:
   ```bash
   npm run check
   ```

4. Run linting:
   ```bash
   npm run lint
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a Pull Request

## Project Structure

```
coursepilot/
├── entrypoints/           # Extension entry points
│   ├── background.ts     # Background worker
│   ├── content/          # Content script
│   └── sidepanel/        # Side panel app
├── lib/                  # Core library code
│   ├── ai/              # AI providers
│   ├── context/         # Content extraction
│   ├── messaging.ts     # Message protocol
│   └── types.ts         # TypeScript types
├── hooks/               # React hooks
├── utils/              # Utility functions
└── docs/               # Documentation
    ├── dev/            # Developer docs
    └── user/           # User docs
```

## Adding New Features

### Adding a New AI Provider

See [Architecture - AI Provider System](architecture.md#ai-provider-system)

### Adding a New Side Panel View

1. Create the view component in `entrypoints/sidepanel/views/`
2. Import and add to the tab router in `entrypoints/sidepanel/App.tsx`
3. Add any necessary messages to `lib/messaging.ts`

Example:
```tsx
// entrypoints/sidepanel/views/MyNewView.tsx
export default function MyNewView() {
  return (
    <div>
      <h1>My New Feature</h1>
    </div>
  );
}
```

```tsx
// entrypoints/sidepanel/App.tsx
import MyNewView from './views/MyNewView';

// Add to tab definitions:
{ id: 'mynew', label: 'My New', icon: '✨' }

// Add to content area:
{activeTab === 'mynew' && <MyNewView />}
```

### Adding New Message Types

1. Define the message type in `lib/messaging.ts`:
```typescript
export type PanelToBackgroundMessage =
  | { type: 'MY_NEW_ACTION'; payload: { myData: string } };
```

2. Handle in `entrypoints/background.ts`:
```typescript
case 'MY_NEW_ACTION': {
  const { myData } = message.payload;
  // Handle the action
  return { ok: true };
}
```

## Style Guide

### Tailwind CSS

This project uses Tailwind v4. Define custom colors in CSS:

```css
/* entrypoints/sidepanel/style.css */
@theme {
  --color-cp-primary: #6366f1;
  --color-cp-success: #10b981;
  --color-cp-warning: #f59e0b;
}
```

### TypeScript

- Always use explicit types for function parameters and return values
- Use interfaces for object shapes
- Prefer type aliases for unions

### React

- Use functional components with hooks
- Use `useCallback` for event handlers
- Use `useEffect` for side effects

## Testing

### Manual Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the test course:
   ```bash
   cd ../activity-monitor-for-ai-assitants/course
   npx docsify-cli serve . --port 4000
   ```

3. Navigate to `http://localhost:4000` in the extension

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Content extraction works on course pages
- [ ] FAB appears after scrolling 70%
- [ ] Quiz generation works
- [ ] Answer evaluation works
- [ ] Chat mode works
- [ ] Progress tracking works
- [ ] Settings persist correctly
- [ ] All AI providers work (if applicable)

## Debugging

### Extension Logs

Check the background worker console:
1. Go to `chrome://extensions`
2. Find CoursePilot
3. Click "Service Worker" > "Console"

### Content Script Logs

1. Navigate to a course page
2. Right-click > Inspect
3. Check the console for content script logs

### Side Panel Logs

1. Open the side panel
2. Right-click > Inspect
3. Check the console

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and follow the code of conduct
