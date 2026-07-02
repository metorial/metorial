import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'chameleon',
  name: 'Chameleon',
  description:
    'Product adoption platform for creating in-app experiences like tours, microsurveys, tooltips, launchers, and HelpBar.',
  metadata: {},
  config,
  auth
});
