import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kickbox',
  name: 'Kickbox',
  description:
    'Email verification platform for identifying deliverable, invalid, or risky email addresses. Supports single and batch verification with quality scoring.',
  metadata: {},
  config,
  auth
});
