import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dynamics-365',
  name: 'Dynamics 365',
  description: undefined,
  metadata: {},
  config,
  auth
});
