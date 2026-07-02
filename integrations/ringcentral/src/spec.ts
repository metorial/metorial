import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ringcentral',
  name: 'RingCentral',
  description:
    'Cloud communications platform providing voice calling, SMS/MMS, fax, team messaging, video meetings, webinars, and contact center capabilities.',
  metadata: {},
  config,
  auth
});
