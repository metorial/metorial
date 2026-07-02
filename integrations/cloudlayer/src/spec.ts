import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudlayer',
  name: 'Cloudlayer',
  description:
    'Generate PDF and image documents from HTML content, URLs, or templates using the Cloudlayer document generation service.',
  metadata: {},
  config,
  auth
});
