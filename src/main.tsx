import { createRoot } from 'react-dom/client';
import App from './admin/App';
import { initMonitoring } from './admin/lib/monitoring';
import './styles/index.css';

// Sentry inicia antes de dibujar, para capturar desde el primer error (spec 0007).
initMonitoring();
createRoot(document.getElementById('root')!).render(<App />);
