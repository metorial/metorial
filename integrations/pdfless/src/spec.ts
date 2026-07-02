import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pdfless',
  name: 'Pdfless',
  description:
    'Generate PDF documents from HTML/CSS templates with dynamic data, encryption, barcodes, and bookmarks.',
  metadata: {},
  config,
  auth
});
