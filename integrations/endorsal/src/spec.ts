import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'endorsal',
  name: 'Endorsal',
  description:
    'Testimonial and review management platform that automates the collection, management, and display of customer testimonials and reviews.',
  metadata: {},
  config,
  auth
});
