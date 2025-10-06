# Footer Component

## Overview
The Footer component is a responsive footer section that appears at the bottom of all pages in the Ho Yu College Scratch Game Platform. It features a green background and displays copyright information along with important links.

## Features

### Visual Design
- **Background Color**: `#4CAF50` (green) - provides a distinct visual separation from the main content
- **White Text**: High contrast text for readability
- **Responsive Layout**: Adapts seamlessly between desktop and mobile views

### Content
- **Copyright Notice**: Displays current year and school name dynamically
- **Footer Links**: Three important links
  - Contact Us
  - Privacy Policy
  - Terms of Service

### Responsive Behavior

#### Desktop View (≥ 960px / md breakpoint)
- Content arranged horizontally with copyright on the left and links on the right
- Links displayed in a row with spacing

#### Mobile View (< 960px / md breakpoint)
- Content stacked vertically
- Copyright text centered at the top
- Links displayed in a centered row below copyright

## Implementation Details

### Dependencies
```typescript
import { Box, Container, Typography, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
```

### Key Features
```typescript
// Dynamic year calculation
const currentYear = new Date().getFullYear();

// Internationalization support
const { t } = useTranslation();
```

### Styling
```typescript
sx={{
  backgroundColor: '#4CAF50',  // Green background
  color: 'white',              // White text
  py: 3,                       // Vertical padding
  mt: 'auto',                  // Stick to bottom
}}
```

## Integration

The Footer component is integrated into the Layout component, ensuring it appears on all pages:

```typescript
// In Layout.tsx
import Footer from '../Footer';

function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
```

## Internationalization

The Footer component supports both English and Chinese through i18next:

### English (en.json)
```json
"footer": {
  "schoolName": "Ho Yu College",
  "allRightsReserved": "All rights reserved.",
  "contactUs": "Contact Us",
  "privacyPolicy": "Privacy Policy",
  "termsOfService": "Terms of Service"
}
```

### Chinese (zh.json)
```json
"footer": {
  "schoolName": "Ho Yu College",
  "allRightsReserved": "版權所有。",
  "contactUs": "聯絡我們",
  "privacyPolicy": "私隱政策",
  "termsOfService": "服務條款"
}
```

## Accessibility

- Uses semantic HTML with `<footer>` element
- Links have proper `href` attributes
- Clear contrast ratio between background and text (green background with white text)
- Responsive design ensures readability on all devices

## Usage

The Footer component is automatically included on all pages through the Layout wrapper. No additional configuration is needed.

## Future Enhancements

Potential improvements could include:
- Actual link destinations (currently placeholder "#")
- Social media icons
- Additional footer sections (e.g., About, Support, Resources)
- Newsletter subscription
- Multi-column layout for larger screens
