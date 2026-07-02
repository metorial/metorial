import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'placid',
  name: 'Placid',
  description:
    'Creative automation platform for generating images, PDFs, and videos from reusable design templates populated with dynamic data.',
  metadata: {},
  config,
  auth
});
