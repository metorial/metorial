import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gender-api',
  name: 'Gender API',
  description:
    'Predict gender and name origins, process first-name batches, and monitor account credits',
  metadata: {},
  config,
  auth
});
