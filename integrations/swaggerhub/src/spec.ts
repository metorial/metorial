import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'swaggerhub',
  name: 'SwaggerHub',
  description:
    'Collaborative platform for designing, managing, and documenting APIs using OpenAPI and AsyncAPI specifications.',
  metadata: {},
  config,
  auth
});
