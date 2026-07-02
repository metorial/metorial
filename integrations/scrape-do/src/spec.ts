import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'scrape-do',
  name: 'Scrape Do',
  description:
    'Web scraping API and rotating proxy service that provides unblocked access to public web data with anti-bot bypass, CAPTCHA solving, and specialized plugins for Amazon and Google Search.',
  metadata: {},
  config,
  auth
});
