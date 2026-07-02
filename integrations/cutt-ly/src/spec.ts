import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cuttly',
  name: 'Cutt.ly',
  description: undefined,
  metadata: {},
  config,
  auth
});
