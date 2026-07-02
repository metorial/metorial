import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dovetail',
  name: 'Dovetail',
  description:
    'Customer insights and research platform for collecting, organizing, and analyzing qualitative and quantitative user research data.',
  metadata: {},
  config,
  auth
});
