import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
});
