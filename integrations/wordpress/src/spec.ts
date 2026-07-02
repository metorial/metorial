import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wordpress',
  name: 'WordPress',
  description:
    'Content management system providing REST API access for managing posts, pages, media, comments, users, taxonomies, and site settings. Supports both WordPress.com hosted sites and self-hosted WordPress.org installations.',
  metadata: {},
  config,
  auth
});
