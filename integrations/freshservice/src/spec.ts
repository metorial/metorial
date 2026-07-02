import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'freshservice',
  name: 'Freshservice',
  description:
    'Cloud-based IT Service Management (ITSM) platform by Freshworks for managing service delivery, incidents, problems, changes, assets, and projects.',
  metadata: {},
  config,
  auth
});
