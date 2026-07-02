import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'benzinga',
  name: 'Benzinga',
  description:
    'Access Benzinga financial data including news, analyst ratings, earnings calendars, market movers, company fundamentals, corporate logos, options activity signals, government trades, SEC filings, and more.',
  metadata: {},
  config,
  auth
});
