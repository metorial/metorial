import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'affinda',
  name: 'Affinda',
  description:
    'AI-powered intelligent document processing platform that extracts structured data from documents such as resumes, invoices, bank statements, passports, and more.',
  metadata: {},
  config,
  auth
});
