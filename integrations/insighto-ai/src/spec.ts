import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'insightoai',
  name: 'Insighto.ai',
  description:
    'No-code conversational AI platform for building, customizing, and deploying AI-powered chat and voice agents across multiple channels.',
  metadata: {},
  config,
  auth
});
