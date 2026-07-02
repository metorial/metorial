import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vapi',
  name: 'Vapi',
  description:
    'Voice AI agent platform for building assistants that make and receive phone calls, conduct web-based voice conversations, and orchestrate multi-assistant workflows.',
  metadata: {},
  config,
  auth
});
