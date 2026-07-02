import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docparser',
  name: 'Docparser',
  description:
    'Extract structured data from PDFs, Word documents, and image-based documents using Zonal OCR, pattern recognition, and anchor keywords.',
  metadata: {},
  config,
  auth
});
