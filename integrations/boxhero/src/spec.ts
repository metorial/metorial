import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'boxhero',
  name: 'BoxHero',
  description:
    'Inventory management platform for small businesses with real-time stock tracking, barcode scanning, and team collaboration across multiple locations.',
  metadata: {},
  config,
  auth
});
