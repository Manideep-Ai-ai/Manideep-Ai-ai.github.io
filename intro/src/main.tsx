import React from 'react';
import {createRoot} from 'react-dom/client';
import IntroExperience from './IntroExperience';
import './styles.css';
createRoot(document.getElementById('intro')!).render(<React.StrictMode><IntroExperience/></React.StrictMode>);
