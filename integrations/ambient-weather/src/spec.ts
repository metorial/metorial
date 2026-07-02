import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ambient-weather',
  name: 'Ambient Weather',
  description:
    'Access real-time and historical weather station data from Ambient Weather personal weather stations via the AmbientWeather.net API.',
  metadata: {},
  config,
  auth
});
