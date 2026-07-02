import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pdf4me',
  name: 'Pdf4me',
  description:
    'Cloud-based document processing API for PDF manipulation including conversion, merging, splitting, OCR, barcode generation, watermarks, data extraction, and document security.',
  metadata: {},
  config,
  auth
});
