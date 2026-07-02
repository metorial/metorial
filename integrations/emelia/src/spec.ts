import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'emelia',
  name: 'Emelia',
  description:
    'B2B prospecting platform for cold email outreach, LinkedIn automation, email finding/verification, phone finding, and LinkedIn Sales Navigator scraping.',
  metadata: {},
  config,
  auth
});
