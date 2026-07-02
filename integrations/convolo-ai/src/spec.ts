import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'convolo-ai',
  name: 'Convolo AI',
  description:
    'AI-powered sales acceleration platform with Speed To Lead for inbound call routing and Power Dialer for outbound calling campaigns. Trigger calls to leads, retrieve call reports and statistics, and receive real-time webhook notifications for call events.',
  metadata: {},
  config,
  auth
});
