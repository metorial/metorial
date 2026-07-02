import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wave',
  name: 'Wave',
  description:
    'Wave Financial (WaveApps) is a free accounting and invoicing platform for small businesses providing accounting, invoicing, receipt scanning, and payment processing capabilities.',
  metadata: {},
  config,
  auth
});
