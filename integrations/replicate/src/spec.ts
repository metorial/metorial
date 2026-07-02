import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'replicate',
  name: 'Replicate',
  description:
    'Run, fine-tune, and deploy machine learning models via API without managing infrastructure.',
  metadata: {},
  config,
  auth
});
