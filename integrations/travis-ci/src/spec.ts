import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'travis-ci',
  name: 'Travis CI',
  description:
    'Hosted CI/CD service that integrates with GitHub repositories to automatically build, test, and deploy code.',
  metadata: {},
  config,
  auth
});
