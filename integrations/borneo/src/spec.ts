import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'borneo',
  name: 'Borneo',
  description:
    'Data security and privacy platform for sensitive data discovery, classification, remediation, and compliance across cloud infrastructure, SaaS applications, and APIs.',
  metadata: {},
  config,
  auth
});
