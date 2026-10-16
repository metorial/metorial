import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'customjs',
  name: 'CustomJS',
  description:
    'Run custom JavaScript and saved functions, generate PDFs and images, extract web data, and manage hosted HTML pages.',
  metadata: {},
  config,
  auth
});
