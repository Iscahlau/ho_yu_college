import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeWrapper } from './theme';
import { LoginPage } from './pages/LoginPage';
import { GamesPage } from './pages/GamesPage';
import { AdminPage } from './pages/AdminPage';
import './i18n';

function App() {
  return (
    <ThemeWrapper>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeWrapper>
  );
}

export default App;
