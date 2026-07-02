import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'chatwork',
  name: 'Chatwork',
  description:
    'Business communication platform providing team messaging, task management, and file sharing within chat rooms.',
  metadata: {},
  config,
  auth
});
