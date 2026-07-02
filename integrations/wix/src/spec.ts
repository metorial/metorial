import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wix',
  name: 'Wix',
  description:
    'Cloud-based website building platform with business management solutions including eCommerce, bookings, events, blog, CRM, and more.',
  metadata: {},
  config,
  auth
});
