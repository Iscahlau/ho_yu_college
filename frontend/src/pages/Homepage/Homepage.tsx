import { Box, Typography, Container } from '@mui/material';

/**
 * Homepage - Displays game library with filters
 * Accessible only after login
 */
function Homepage() {
  return (
    <Container>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          學趣天地 - Game Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Browse and play Scratch games. Use filters to find games by subject and difficulty.
        </Typography>
      </Box>
    </Container>
  );
}

export default Homepage;
