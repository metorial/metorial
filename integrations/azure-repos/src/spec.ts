import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'azure-repos',
  name: 'Azure Repos',
  description: undefined,
  metadata: {},
  config,
  auth
});
