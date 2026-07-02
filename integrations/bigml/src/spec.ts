import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigml',
  name: 'BigML',
  description:
    'Cloud-based Machine Learning platform for building, managing, and deploying ML models via the BigML.io REST API.',
  metadata: {},
  config,
  auth
});
