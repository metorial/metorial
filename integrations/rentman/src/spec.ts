import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rentman',
  name: 'Rentman',
  description:
    'Cloud-based rental management platform for the AV and event production industry. Schedule resources, track inventory, manage crew, and create professional quotes.',
  metadata: {},
  config,
  auth
});
