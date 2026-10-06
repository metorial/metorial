import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dpd2',
  name: 'DPD (Digital Product Delivery)',
  description:
    'DPD (Digital Product Delivery) is an e-commerce platform for selling and delivering digital products such as e-books, software, music, videos, and keycodes. The API provides paged storefront, product, purchase, subscriber and customer reads, notification verification and acknowledged purchase reactivation.',
  metadata: {},
  config,
  auth
});
