import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'labs64-netlicensing',
  name: 'Labs64 NetLicensing',
  description:
    'Licensing-as-a-Service platform for managing and enforcing software licenses. Supports multiple licensing models including subscriptions, try-and-buy, pay-per-use, floating, and more.',
  metadata: {},
  config,
  auth
});
