import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'flutterwave',
  name: 'Flutterwave',
  description:
    'Inspect and manage payments, payouts, recurring billing, virtual accounts, bills, refunds and settlements through the supported Flutterwave API v3.',
  metadata: {},
  config,
  auth
});
