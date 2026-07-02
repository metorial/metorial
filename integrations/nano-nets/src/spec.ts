import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nanonets',
  name: 'Nanonets',
  description:
    'AI-powered intelligent document processing platform for extracting structured data from documents, classifying images, and detecting objects using OCR and deep learning.',
  metadata: {},
  config,
  auth
});
