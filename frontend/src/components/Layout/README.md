# Layout Component

## Overview
The Layout component is the main wrapper for all pages in the application. It provides consistent structure with a navbar at the top, footer at the bottom, and main content area in between.

## Features

### Rainbow Background (Desktop Only)
As of the latest update, the Layout component now includes a decorative rainbow background image that appears in the top-right corner of the screen.

#### Specifications:
- **Visibility**: Only shown on desktop/wide-screen views (≥900px)
- **Position**: Top-right corner, fixed position (doesn't move on scroll)
- **Size**: Approximately 25% of screen area (25vw × 33.33vh)
- **Image**: `/assets/images/rainbow-left.svg` - left half of a rainbow with clouds
- **Opacity**: 0.85 for subtle appearance
- **Z-index**: 0 (behind all content)
- **Pointer Events**: None (doesn't interfere with clicks)

#### Responsive Behavior:
- **Desktop (≥900px)**: Rainbow visible in top-right corner
- **Mobile (<900px)**: Rainbow completely hidden, no impact on mobile layout

### Structure
```
Layout
├── Rainbow Background (desktop only, fixed position)
└── Content Container
    ├── Navbar
    ├── Main Content (children)
    └── Footer
```

## Implementation Details

### Dependencies
```typescript
import { Box, useTheme, useMediaQuery } from '@mui/material';
```

### Responsive Breakpoint
The component uses Material UI's standard breakpoints:
- `md` (medium) = 900px
- Screens **< 900px** are considered mobile
- Screens **≥ 900px** are considered desktop

This matches the responsive design pattern used throughout the application (e.g., Navbar component).

### Key Styling
```typescript
// Main container
sx={{
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: '#16D3F9',
  position: 'relative',
  overflow: 'hidden'
}}

// Rainbow background (desktop only)
{isWideScreen && (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '25vw',
      height: '33.33vh',
      backgroundImage: 'url(/assets/images/rainbow-left.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'top right',
      pointerEvents: 'none',
      zIndex: 0,
      opacity: 0.85
    }}
  />
)}

// Content wrapper with z-index to appear above rainbow
sx={{
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh'
}}
```

## Usage

The Layout component is used to wrap all page components:

```typescript
import Layout from './components/Layout';

function App() {
  return (
    <Layout>
      <YourPageComponent />
    </Layout>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| children | React.ReactNode | Yes | The page content to display |

## Background Color

The main background color is set to `#16D3F9` (cyan/turquoise blue), which provides a bright, cheerful appearance suitable for a primary school platform.

## Z-Index Hierarchy

1. **Rainbow Background**: z-index: 0 (bottom layer)
2. **Content (Navbar, Main, Footer)**: z-index: 1 (above rainbow)

This ensures the rainbow stays decorative and doesn't interfere with interactive elements.

## Accessibility

- The rainbow is purely decorative and uses `pointerEvents: 'none'`
- All interactive elements remain fully accessible
- No impact on screen readers or keyboard navigation
- Mobile users see the standard layout without distraction

## Testing

When testing the Layout component:
1. Verify rainbow appears on desktop view (≥900px width)
2. Verify rainbow is hidden on mobile view (<900px width)
3. Check that rainbow stays fixed when scrolling
4. Ensure all interactive elements work normally (clicks, hovers, etc.)
5. Verify rainbow doesn't cover important content

## Future Enhancements

Potential improvements could include:
- Animated rainbow entrance effect
- Seasonal theme variations
- User preference to show/hide decorative elements
- Additional decorative elements for other screen areas
