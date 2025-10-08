# Navbar Component - Responsive Design

## Overview
The Navbar component is a responsive navigation bar that adapts to different screen sizes, providing an optimal user experience on both desktop and mobile devices.

## Features

### Desktop View (≥ 900px / md breakpoint)
When viewed on desktop or wide screens, the Navbar displays elements in a three-section layout:
- **Left**: School logo
- **Center**: Platform title (學趣天地) - absolutely positioned and horizontally centered
- **Right** (vertical layout with two rows):
  - **Row 1**: Language toggle button (English/中文) and Login/Logout button
  - **Row 2**: Student information (when authenticated): Name, ID, and Marks - displayed below the buttons

### Mobile View (< 900px / md breakpoint)
When viewed on mobile or narrow screens, the Navbar transforms into a compact App Bar:
- **Visible Elements**:
  - Hamburger menu icon (☰) - *only when authenticated*
  - School logo (smaller size: 40px vs 50px)
  - Platform title (smaller font: h6 vs h4)
  - Language toggle button
  - Login/Logout button

- **Hamburger Menu (Drawer)**:
  - Opens from the left side
  - Contains student information:
    - Student name with icon
    - Student ID
    - Current marks/score
  - Styled with app theme colors (#9575CD)
  - Closes when clicking outside (overlay) or navigating

## Implementation Details

### Dependencies
```typescript
import {
  AppBar, Toolbar, Typography, Button, Box, 
  IconButton, Drawer, List, ListItem, ListItemText, 
  useTheme, useMediaQuery, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PermIdentityOutlinedIcon from '@mui/icons-material/PermIdentityOutlined';
```

### Responsive Logic
```typescript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

### State Management
```typescript
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

## Behavior

### Authentication States

#### Unauthenticated
- Desktop: Shows "Login" button
- Mobile: Shows "Login" button (no hamburger menu)

#### Authenticated
- Desktop: Shows Language toggle and "Logout" button in top row, with user info displayed below in a second row
- Mobile: Shows hamburger menu + "Logout" button
  - User info is hidden from navbar
  - User info is accessible via hamburger menu

### Responsive Breakpoint
The component uses Material UI's standard breakpoints:
- `md` (medium) = 900px
- Screens **< 900px** are considered mobile
- Screens **≥ 900px** are considered desktop

## User Experience

### Mobile Menu Interaction
1. User taps hamburger icon (☰)
2. Drawer slides in from left with backdrop overlay
3. User can view their information
4. User taps outside drawer or anywhere to close it
5. Drawer slides out smoothly

### Accessibility
- Hamburger button has `aria-label="menu"`
- Proper ARIA roles for navigation elements
- Touch-friendly button sizes on mobile
- Clear visual feedback on interactions

## Styling

### Colors
- App Bar background: `#9575CD` (purple)
- Button backgrounds: `rgba(255,255,255,0.2)` with hover state
- Drawer background: `#f5f5f5` (light gray)
- Drawer header: `#9575CD` (matches app theme)

### Responsive Sizing
- Desktop logo height: 50px
- Mobile logo height: 40px
- Desktop title: h4 variant
- Mobile title: h6 variant
- Button padding adjusts based on screen size

## Code Example

```typescript
// Desktop layout with vertical flex direction for right section
{!isMobile && (
  <Box sx={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 0.5
  }}>
    {/* Row 1: Language toggle and Login/Logout buttons */}
    <Box sx={{ display: 'flex', gap: 1.5 }}>
      <Button onClick={toggleLanguage}>
        {i18n.language === 'en' ? '中文' : 'English'}
      </Button>
      <Button onClick={isAuthenticated ? handleLogout : handleLogin}>
        {isAuthenticated ? t('nav.logout') : t('nav.login')}
      </Button>
    </Box>
    
    {/* Row 2: User info (when authenticated) */}
    {isAuthenticated && user && (
      <Typography variant="body1">
        <PermIdentityOutlinedIcon /> 
        {user.name2} {user.id} {t('nav.marks')}:{user.marks}
      </Typography>
    )}
  </Box>
)}

// Title with absolute positioning for true centering
<Typography
  sx={{
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)'
  }}
>
  {t('app.title')}
</Typography>

// Hamburger menu only on mobile when authenticated
{isMobile && isAuthenticated && (
  <IconButton onClick={toggleMobileMenu}>
    <MenuIcon />
  </IconButton>
)}
```

## Testing

To test the responsive behavior:
1. Open the app in a browser
2. Open Developer Tools (F12)
3. Toggle Device Toolbar (Ctrl+Shift+M)
4. Switch between different device sizes
5. Log in to see authenticated state
6. Verify hamburger menu appears and functions correctly on mobile

## Future Enhancements

Potential improvements for future iterations:
- Add filter options to mobile drawer menu
- Include quick navigation links in drawer
- Add swipe gestures to open/close drawer
- Persist drawer state preference
- Add animation when switching between breakpoints
