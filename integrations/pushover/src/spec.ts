import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pushover',
  name: 'Pushover',
  description:
    'Send real-time push notifications to Android, iOS, and desktop devices via Pushover. Manage delivery groups, track emergency message acknowledgements, and push widget data to smartwatches.',
  metadata: {},
  config,
  auth
});
