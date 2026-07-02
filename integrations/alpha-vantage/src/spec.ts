import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'alpha-vantage',
  name: 'Alpha Vantage',
  description:
    'Financial data API providing stock prices, forex, crypto, commodities, economic indicators, technical indicators, and company fundamentals.',
  metadata: {},
  config,
  auth
});
