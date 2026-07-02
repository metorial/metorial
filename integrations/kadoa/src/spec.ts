import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kadoa',
  name: 'Kadoa',
  description:
    'AI-powered web data extraction platform that automates scraping, transformation, and delivery of structured data from websites, PDFs, and documents.',
  metadata: {},
  config,
  auth
});
