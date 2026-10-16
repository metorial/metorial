import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'logodev',
  name: 'Logo.dev',
  description:
    'Look up company brand profiles, colors, and social links; search for company domains; create logo display URLs; and download logo or brandmark files by domain, ticker, crypto symbol, ISIN, or name.',
  metadata: {},
  config,
  auth
});
