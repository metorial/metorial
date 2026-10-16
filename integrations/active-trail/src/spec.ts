import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'activetrail',
  name: 'ActiveTrail',
  description:
    'Manage ActiveTrail email, SMS, and WhatsApp campaigns, contacts, groups, mailing lists, templates, automation activation, reports, and webhooks.',
  metadata: {},
  config,
  auth
});
