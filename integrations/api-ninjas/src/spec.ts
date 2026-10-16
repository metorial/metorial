import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'api-ninjas',
  name: 'API Ninjas',
  description:
    'Look up financial prices, currency conversions, weather, places, time, text analysis, nutrition, reference data, and contact validation through API Ninjas.',
  metadata: {},
  config,
  auth
});
