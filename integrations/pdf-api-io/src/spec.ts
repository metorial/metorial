import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pdf-apiio',
  name: 'Pdf Api.io',
  description:
    'PDF generation service for creating dynamic PDF documents from templates via a REST API.',
  metadata: {},
  config,
  auth
});
