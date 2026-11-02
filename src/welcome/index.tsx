import { createRoot } from 'react-dom/client';
import '../content/styles.css';
import { WelcomeApp } from './WelcomeApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<WelcomeApp />);
}
