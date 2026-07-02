import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'neutrino',
  name: 'Neutrino',
  description:
    'General-purpose utility APIs for data validation, security, geolocation, imaging, e-commerce, and telephony.',
  metadata: {},
  config,
  auth
});
