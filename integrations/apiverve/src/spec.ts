import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apiverve',
  name: 'APIVerve',
  description:
    'Validate data, analyze and translate text, convert currencies, inspect domains, retrieve weather and IP locations, generate QR codes, and monitor APIVerve account usage.',
  metadata: {},
  config,
  auth
});
