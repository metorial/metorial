import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-attachments',
  name: 'Test (attachments)',
  description:
    'Internal test slate for attachment flows. Exposes a tool that returns two inline text attachments for storage and retrieval testing.',
  metadata: {},
  config,
  auth
});
