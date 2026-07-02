import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cats',
  name: 'CATS',
  description:
    'Cloud-based applicant tracking system and recruiting software for managing the full recruitment lifecycle.',
  metadata: {},
  config,
  auth
});
