import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'flutterwave',
  name: 'Flutterwave',
  description:
    'African payments technology platform for accepting payments, sending payouts, managing subscriptions, virtual accounts, bill payments, and identity verification across multiple African and global markets.',
  metadata: {},
  config,
  auth
});
