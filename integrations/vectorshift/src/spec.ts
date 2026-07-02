import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vectorshift',
  name: 'VectorShift',
  description:
    'AI automations platform for building, deploying, and managing AI workflows, knowledge bases, chatbots, and transformations.',
  metadata: {},
  config,
  auth
});
