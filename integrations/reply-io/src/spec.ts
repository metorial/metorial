import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'replyio',
  name: 'Reply.io',
  description:
    'Multichannel sales engagement platform that automates outreach across email, LinkedIn, calls, SMS, and WhatsApp. Manage contacts, build outreach sequences, track engagement, and analyze campaign performance.',
  metadata: {},
  config,
  auth
});
