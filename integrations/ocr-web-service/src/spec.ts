import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ocr-web-service',
  name: 'OCR Web Service',
  description:
    'Cloud-based OCR service that extracts text from scanned documents and images, and converts them into editable Word, Text, Excel, PDF, and RTF formats. Supports 46 recognition languages and zonal OCR.',
  metadata: {},
  config,
  auth
});
