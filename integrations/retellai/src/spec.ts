import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'retell-ai',
  name: 'Retell AI',
  description:
    'Build, deploy, and manage AI phone agents with Retell AI. Make and receive calls, manage agents, phone numbers, voices, knowledge bases, and batch campaigns.',
  metadata: {},
  config,
  auth
});
