import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apilio',
  name: 'Apilio',
  description:
    'Smart home automation platform for creating complex logic with variables, conditions, and logicblocks across multiple device brands.',
  metadata: {},
  config,
  auth
});
