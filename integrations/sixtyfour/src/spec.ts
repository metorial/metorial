import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export const spec = SlateSpecification.create({
  key: 'sixtyfour',
  name: 'Sixtyfour',
  description:
    'Search and research people and companies, discover contact details, and inspect investigations with Sixtyfour.',
  metadata: {},
  config,
  auth
});
