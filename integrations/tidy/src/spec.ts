import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tidy',
  name: 'Tidy',
  description:
    'TIDY is a property management platform that connects property owners and managers with cleaning and maintenance service professionals. It provides tools for booking and managing cleaning/maintenance jobs, managing properties, handling guest reservations, tracking to-do lists, and managing service provider relationships.',
  metadata: {},
  config,
  auth
});
