import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'solcast',
  name: 'Solcast',
  description:
    'Retrieve global solar irradiance, weather, and PV power data for any location. Access live estimated actuals, forecasts up to 14 days ahead, and historical time series from 2007.',
  metadata: {},
  config,
  auth
});
