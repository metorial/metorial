import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'genderapiio',
  name: 'Gender Api.io',
  description: undefined,
  metadata: {},
  config,
  auth
});
