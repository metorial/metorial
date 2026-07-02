import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dpd2',
  name: 'DPD',
  description:
    'DPD (Digital Product Delivery) is an e-commerce platform for selling and delivering digital products such as e-books, software, music, videos, and keycodes. The API provides read-only access to storefronts, products, purchases, subscribers, and customers.',
  metadata: {},
  config,
  auth
});
