import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aeroleads',
  name: 'Aeroleads',
  description:
    'B2B lead generation platform with 750M+ prospect records. Look up LinkedIn profiles and find business email addresses using name and company domain.',
  metadata: {},
  config,
  auth
});
