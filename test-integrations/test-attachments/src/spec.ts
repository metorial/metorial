import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-attachments',
  name: 'Test (attachments)',
  description:
    'Internal test slate for attachment flows. Exercises direct uploads, large content, authenticated proxied URLs, and expiring URL refreshes.',
  metadata: {},
  config,
  auth
});
