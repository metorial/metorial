import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'invision',
  name: 'InVision',
  description:
    'Legacy design token and Enterprise SCIM user provisioning tools for InVision. InVision discontinued its design products on December 31, 2024; API availability is not guaranteed.',
  metadata: {},
  config,
  auth
});
