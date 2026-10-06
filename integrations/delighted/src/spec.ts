import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'delighted',
  name: 'Delighted',
  description:
    'Discontinued: Delighted customer access ended on July 1, 2026. Legacy tools remain for compatibility and cannot make provider requests.',
  metadata: {},
  config,
  auth
});
