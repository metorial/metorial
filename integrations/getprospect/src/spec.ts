import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'getprospect',
  name: 'GetProspect',
  description:
    'B2B lead generation platform with email finding, verification, CRM, and outreach sequence management.',
  metadata: {},
  config,
  auth
});
