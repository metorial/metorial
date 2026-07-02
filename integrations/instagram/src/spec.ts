import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'instagram',
  name: 'Instagram',
  description:
    'Instagram is a visual social media platform by Meta. Connect to manage content, comments, insights, messaging, and hashtag search via the Instagram Graph API.',
  metadata: {},
  config,
  auth
});
