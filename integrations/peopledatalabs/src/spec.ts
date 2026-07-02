import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'people-data-labs',
  name: 'People Data Labs',
  description:
    'Data provider with billions of person and company profiles, offering APIs to enrich, search, and identify records using attributes like name, email, phone, employment, education, and social profiles.',
  metadata: {},
  config,
  auth
});
