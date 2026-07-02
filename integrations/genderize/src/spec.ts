import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'genderize',
  name: 'Genderize',
  description:
    'Predict the gender associated with a given name using statistical data from Genderize.io.',
  metadata: {},
  config,
  auth
});
