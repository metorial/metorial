import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clearbit',
  name: 'Clearbit',
  description:
    'B2B data intelligence platform for enriching contact and company data, identifying anonymous website visitors, and prospecting for leads.',
  metadata: {},
  config,
  auth
});
