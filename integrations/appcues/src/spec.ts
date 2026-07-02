import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'appcues',
  name: 'Appcues',
  description:
    'Product adoption platform for building in-app experiences such as onboarding flows, tooltips, checklists, banners, NPS surveys, and announcements.',
  metadata: {},
  config,
  auth
});
