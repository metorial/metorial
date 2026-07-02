import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'parsioio',
  name: 'Parsio.io',
  description:
    'No-code document parsing and data extraction platform. Extract structured data from emails, PDFs, images, and other document formats using template-based, OCR, and GPT-powered parsing engines.',
  metadata: {},
  config,
  auth
});
