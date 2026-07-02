import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docuseal',
  name: 'Docu Seal',
  description: undefined,
  metadata: {},
  config,
  auth
});
