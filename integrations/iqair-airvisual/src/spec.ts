import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'iqair-airvisual',
  name: 'Iqair Airvisual',
  description:
    'Access real-time, forecast, and historical air quality and weather data from IQAir AirVisual, covering 5,000+ cities across 100+ countries.',
  metadata: {},
  config,
  auth
});
