import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'etermin',
  name: 'eTermin',
  description:
    'Cloud-based online appointment scheduling platform that allows businesses to offer 24/7 booking via their website, Google search, and social media.',
  metadata: {},
  config,
  auth
});
