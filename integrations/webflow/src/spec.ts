import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'webflow',
  name: 'Webflow',
  description:
    'Visual website builder and CMS platform. Manage sites, CMS collections, ecommerce products and orders, user accounts, forms, pages, and assets through the Webflow API.',
  metadata: {},
  config,
  auth
});
