import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'synthflow-ai',
  name: 'Synthflow AI',
  description:
    'Voice AI platform for automating inbound and outbound phone calls using AI-powered agents.',
  metadata: {},
  config,
  auth
});
