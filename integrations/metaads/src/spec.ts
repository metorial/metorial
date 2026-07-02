import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'meta-ads',
  name: 'Meta Ads',
  description:
    'Integration with Meta Ads (Marketing API) for managing ad campaigns across Facebook, Instagram, Messenger, and WhatsApp.',
  metadata: {},
  config,
  auth
});
