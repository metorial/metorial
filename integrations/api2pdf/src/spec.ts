import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'api2pdf',
  name: 'API2PDF',
  description:
    'REST API for PDF generation, document conversion, and file transformation. Supports HTML/URL/Markdown to PDF, screenshots, Office document conversion, PDF merging, page extraction, password protection, barcode/QR code generation, thumbnails, and more.',
  metadata: {},
  config,
  auth
});
