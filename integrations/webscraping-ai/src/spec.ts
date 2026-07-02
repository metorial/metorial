import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'webscrapingai',
  name: 'Web Scraping.ai',
  description:
    'Web scraping API with automatic proxy rotation, headless browser rendering, CAPTCHA solving, and AI-powered data extraction.',
  metadata: {},
  config,
  auth
});
