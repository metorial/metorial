import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'iqair-airvisual',
  name: 'IQAir AirVisual',
  description:
    'Read outdoor city and station air quality, weather, location directories, and plan-dependent forecasts and recent history from IQAir AirVisual.',
  metadata: {},
  config,
  auth
});
