import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jungle-scout',
  name: 'Jungle Scout',
  description: undefined,
  metadata: {},
  config,
  auth
});
