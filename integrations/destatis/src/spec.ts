import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'destatis',
  name: 'Destatis GENESIS-Online',
  description:
    'Access official German statistics and configurable tables from the GENESIS-Online database.',
  metadata: {},
  config,
  auth
});
