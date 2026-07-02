import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'recruitee',
  name: 'Recruitee',
  description:
    'Collaborative hiring platform for managing candidates, job offers, talent pools, and recruitment pipelines.',
  metadata: {},
  config,
  auth
});
