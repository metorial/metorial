import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'commcare',
  name: 'CommCare',
  description:
    'Open-source mobile data collection and case management platform by Dimagi for frontline workers in health, agriculture, and social services.',
  metadata: {},
  config,
  auth
});
