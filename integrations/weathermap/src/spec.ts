import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'openweathermap',
  name: 'OpenWeatherMap',
  description:
    'Weather data provider offering current conditions, forecasts, historical archives, air quality data, geocoding, and weather maps for any location on the globe.',
  metadata: {},
  config,
  auth
});
