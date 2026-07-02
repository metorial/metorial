import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aryn',
  name: 'Aryn',
  description:
    'Enterprise AI platform for document parsing, data extraction, analytics, and search at scale. Aryn DocParse segments and labels documents, extracts tables and images, performs OCR, and converts 30+ document types into structured JSON, Markdown, or HTML.',
  metadata: {},
  config,
  auth
});
