import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'token-metrics',
  name: 'Token Metrics',
  description:
    'Cryptocurrency market data, AI grades, signals, research, model indices, and Moonshot selections from Token Metrics',
  metadata: {},
  config,
  auth
});
