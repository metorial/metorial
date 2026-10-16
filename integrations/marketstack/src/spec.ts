import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'marketstack',
  name: 'Marketstack',
  description:
    'Query stock prices, company information, corporate actions, commodities, bonds, indices, ETF holdings, and SEC EDGAR data through Marketstack.',
  metadata: {},
  config,
  auth
});
