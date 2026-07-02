import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'customjs',
  name: 'CustomJS',
  description:
    'Automation platform for executing custom JavaScript/Python code, generating PDFs and images from HTML, capturing screenshots, scraping web content, and hosting static HTML pages.',
  metadata: {},
  config,
  auth
});
