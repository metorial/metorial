import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrapingbee',
  name: 'Scrapingbee',
  description:
    'Web scraping API with headless browsers, proxy rotation, CAPTCHA solving, and AI-powered data extraction. Includes specialized APIs for Google, Amazon, YouTube, and Walmart.',
  metadata: {},
  config,
  auth
});
