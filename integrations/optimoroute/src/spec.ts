import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'optimoroute',
  name: 'Optimo Route',
  description: undefined,
  metadata: {},
  config,
  auth
});
