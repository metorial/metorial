import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ocrspace',
  name: 'OCR.space',
  description:
    'Cloud-based OCR service that extracts text from images and PDF documents. Supports multiple OCR engines, numerous languages, searchable PDF generation, and word coordinate extraction.',
  metadata: {},
  config,
  auth
});
