import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'resistant-ai',
  name: 'Resistant AI',
  description:
    'Analyze original documents for fraud with Resistant Documents, retrieve detailed results, and delete submissions. Existing IdentityCheck verification and screening tools remain available with a separate legacy IdentityCheck API Key connection.',
  metadata: {},
  config,
  auth
});
