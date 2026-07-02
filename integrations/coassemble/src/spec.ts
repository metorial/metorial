import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'coassemble',
  name: 'Coassemble',
  description:
    'Online training platform for creating, delivering, and tracking e-learning courses with AI-powered course generation and embeddable course experiences.',
  metadata: {},
  config,
  auth
});
