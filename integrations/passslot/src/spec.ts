import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'passslot',
  name: 'PassSlot',
  description:
    'Cloud service for creating and managing mobile wallet passes for Apple Wallet, Android Pay, and HTML5.',
  metadata: {},
  config,
  auth
});
