import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pushbullet',
  name: 'Pushbullet',
  description:
    'Connect devices to send push notifications, share links and files, send SMS/MMS messages, and sync clipboard content across all your devices.',
  metadata: {},
  config,
  auth
});
