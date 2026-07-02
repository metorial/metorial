import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vestaboard',
  name: 'Vestaboard',
  description:
    'Send and read messages on Vestaboard smart display devices. Supports the Flagship (6x22), Vestaboard Note (3x15), and Note Array configurations via Cloud, Subscription, and Local APIs.',
  metadata: {},
  config,
  auth
});
