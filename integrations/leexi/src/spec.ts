import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leexi',
  name: 'Leexi',
  description: undefined,
  metadata: {},
  config,
  auth
});
