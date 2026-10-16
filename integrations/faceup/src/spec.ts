import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'faceup',
  name: 'FaceUp',
  description:
    'Query compliance reporting statistics, retrieve report metadata, and synchronize the employee directory in FaceUp.',
  metadata: {},
  config,
  auth
});
