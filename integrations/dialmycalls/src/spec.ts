import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dialmycalls',
  name: 'DialMyCalls',
  description:
    'Mass notification platform for sending voice call broadcasts, SMS/MMS text message broadcasts, and managing contacts.',
  metadata: {},
  config,
  auth
});
