import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'payhip',
  name: 'Payhip',
  description:
    'E-commerce platform for creators to sell digital products, courses, memberships, and physical products. Supports coupon management, license key verification, and webhook-based event tracking.',
  metadata: {},
  config,
  auth
});
