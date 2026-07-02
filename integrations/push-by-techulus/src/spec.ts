import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'push-by-techulus',
  name: 'Push by Techulus',
  description:
    'Send custom push notifications to iOS and Android devices via a REST API. Supports notifications to individual accounts, teams, and device groups with customizable sound, channel, links, images, and time-sensitive delivery.',
  metadata: {},
  config,
  auth
});
