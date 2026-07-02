import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docsumo',
  name: 'Docsumo',
  description:
    'AI-powered intelligent document processing platform for automated data extraction from invoices, bank statements, tax forms, and more.',
  metadata: {},
  config,
  auth
});
