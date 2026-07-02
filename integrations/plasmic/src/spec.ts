import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plasmic',
  name: 'Plasmic',
  description:
    'Visual web design platform with headless CMS. Render components as HTML, access project models, manage CMS content, and update projects programmatically.',
  metadata: {},
  config,
  auth
});
