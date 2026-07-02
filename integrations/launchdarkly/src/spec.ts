import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'launchdarkly',
  name: 'LaunchDarkly',
  description:
    'Feature management platform for controlling feature flags, running experiments, managing rollouts, and targeting user segments across projects and environments.',
  metadata: {},
  config,
  auth
});
