import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'simlacom',
  name: 'Simla.com',
  description:
    'Omnichannel CRM platform for eCommerce. Manage customers, orders, products, and track changes across your store.',
  metadata: {},
  config,
  auth
});
