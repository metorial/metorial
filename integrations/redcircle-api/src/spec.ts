import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'redcircle-api',
  name: 'RedCircle API',
  description:
    'Real-time data extraction API for retrieving publicly available product data from Target (US retailer). Provides product details, pricing, availability, fulfillment information, reviews, and more.',
  metadata: {},
  config,
  auth
});
