import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'braze',
  name: 'Braze',
  description:
    'Customer engagement platform for sending personalized messages across email, push, SMS, in-app, and more. Track user behavior, manage campaigns and Canvases, segment audiences, and export analytics.',
  metadata: {},
  config,
  auth
});
