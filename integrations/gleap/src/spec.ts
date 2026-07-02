import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gleap',
  name: 'Gleap',
  description:
    'Customer feedback and support platform for websites and mobile apps. Provides bug reporting, live chat, help centers, surveys, product tours, and AI-powered customer support.',
  metadata: {},
  config,
  auth
});
