import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dripcel',
  name: 'Dripcel',
  description:
    'SMS and email marketing automation platform with ML-optimized delivery, campaign exchange, compliance checking, and contact management.',
  metadata: {},
  config,
  auth
});
