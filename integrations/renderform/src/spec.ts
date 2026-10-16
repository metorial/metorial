import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'renderform',
  name: 'Renderform',
  description:
    'Generate images, PDFs, videos, and screenshots, manage templates and results, and inspect account usage.',
  metadata: {},
  config,
  auth
});
