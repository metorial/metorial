import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nasdaq',
  name: 'Nasdaq',
  description:
    'Access Nasdaq Data Link for historical and real-time financial market data including equities, options, futures, economics, and alternative data.',
  metadata: {},
  config,
  auth
});
