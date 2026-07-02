import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'toneden',
  name: 'ToneDen',
  description:
    'Social media marketing automation platform for creators, event promoters, and brands. Provides tools for ad campaigns, smart links (FanLinks), social unlocks, contests, and playbook-based campaign templates.',
  metadata: {},
  config,
  auth
});
