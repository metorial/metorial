import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appcircle',
  name: 'Appcircle',
  description:
    'Mobile CI/CD platform that automates build, test, sign, distribute, and publish workflows for iOS and Android applications.',
  metadata: {},
  config,
  auth
});
