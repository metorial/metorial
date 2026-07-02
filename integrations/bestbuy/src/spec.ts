import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bestbuy',
  name: 'Best Buy',
  description:
    'Access Best Buy product catalog, store information, categories, product recommendations, and open box deals through the Best Buy Developer API.',
  metadata: {},
  config,
  auth
});
