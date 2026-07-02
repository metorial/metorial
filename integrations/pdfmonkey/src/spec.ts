import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pdfmonkey',
  name: 'PDFMonkey',
  description:
    'Generate PDF documents and images from HTML/CSS templates populated with dynamic JSON data.',
  metadata: {},
  config,
  auth
});
