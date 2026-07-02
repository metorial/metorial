import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'heyzine',
  name: 'Heyzine',
  description:
    'Online flipbook maker that converts PDFs, DOCX, and PPTX files into interactive digital flipbooks with page-turning effects.',
  metadata: {},
  config,
  auth
});
