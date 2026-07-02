import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'buildkite',
  name: 'Buildkite',
  description:
    'CI/CD platform for running build pipelines on your own infrastructure with hosted orchestration.',
  metadata: {},
  config,
  auth
});
