import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReviewApp } from './review/ReviewApp';
import { Preview } from './shell/Preview';
import './styles/tokens.css';
createRoot(document.getElementById('root')!).render(<StrictMode>{location.pathname === '/preview' ? <Preview/> : <ReviewApp/>}</StrictMode>);
