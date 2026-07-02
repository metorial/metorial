import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deel',
  name: 'Deel',
  description:
    'Global payroll and compliance platform for hiring and managing international employees and contractors.',
  metadata: {},
  config,
  auth
});
