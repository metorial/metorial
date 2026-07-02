import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'algodocs',
  name: 'Algodocs',
  description:
    'AI-powered document data extraction platform that extracts structured data from PDFs, images, Word, and Excel documents using OCR, pre-trained models, and custom extractors.',
  metadata: {},
  config,
  auth
});
