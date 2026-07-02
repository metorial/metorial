import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vonage',
  name: 'Vonage',
  description:
    'Cloud communications platform providing APIs for messaging (SMS, MMS, WhatsApp, Messenger, Viber, RCS), voice calling, video conferencing, user verification, and phone number intelligence.',
  metadata: {},
  config,
  auth
});
