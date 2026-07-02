import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'data247',
  name: 'Data 247',
  description:
    'A simple, secure on-demand data platform providing real-time phone carrier lookups, email-to-SMS gateway solutions, data verification, data appending, IP geolocation, Do-Not-Call compliance checking, and fraud detection services.',
  metadata: {},
  config,
  auth
});
