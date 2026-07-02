import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shipengine',
  name: 'ShipEngine',
  description:
    'Multi-carrier shipping API for creating labels, comparing rates, validating addresses, and tracking packages across FedEx, UPS, USPS, DHL, and more.',
  metadata: {},
  config,
  auth
});
