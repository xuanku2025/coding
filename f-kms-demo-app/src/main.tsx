import React from 'react';
import ReactDOM from 'react-dom/client';
import '@zstack/design/dist/style.css';
import { IntlProvider } from 'react-intl';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IntlProvider locale="zh-CN" messages={{}}>
      <App />
    </IntlProvider>
  </React.StrictMode>
);
