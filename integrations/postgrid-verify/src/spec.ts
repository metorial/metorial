import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postgrid-verify',
  name: 'PostGrid Verify',
  description:
    'Address verification, autocomplete, and geocoding API supporting US, Canada, and 245+ international countries. CASS and SERP certified.',
  metadata: {},
  config,
  auth
});
