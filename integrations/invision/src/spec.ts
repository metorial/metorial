import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'invision',
  name: 'InVision',
  description:
    'InVision was a digital product design platform providing design tokens, icons, and SCIM user provisioning APIs. The service was permanently shut down on December 31, 2024.',
  metadata: {},
  config,
  auth
});
