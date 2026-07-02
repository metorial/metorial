import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'norges-bank',
  name: 'Norges Bank',
  description:
    'Retrieve raw exchange-rate and generic-rate SDMX JSON from Norges Bank public statistics.',
  metadata: {},
  config,
  auth
});
