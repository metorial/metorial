import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jumpcloud',
  name: 'JumpCloud',
  description:
    'Cloud-based directory platform providing identity and access management, device management, and SSO capabilities.',
  metadata: {},
  config,
  auth
});
