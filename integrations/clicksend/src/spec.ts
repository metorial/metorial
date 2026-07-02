import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clicksend',
  name: 'ClickSend',
  description:
    'Cloud-based communications platform for sending SMS, MMS, voice, email, and physical post worldwide.',
  metadata: {},
  config,
  auth
});
