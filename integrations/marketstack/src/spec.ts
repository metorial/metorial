import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'marketstack',
  name: 'Marketstack',
  description:
    'Real-time, intraday, and historical stock market data covering 30,000+ tickers from 70+ exchanges worldwide, plus commodities, bonds, indices, ETF holdings, and SEC EDGAR filings.',
  metadata: {},
  config,
  auth
});
