import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'esputnik',
  name: 'Esputnik',
  description:
    'eSputnik (Yespo) is a marketing automation platform for omnichannel messaging across Email, SMS, Viber, Web Push, Mobile Push, App Inbox, Telegram, and In-App channels. It provides contact management, audience segmentation, workflow automation, product recommendations, and campaign analytics.',
  metadata: {},
  config,
  auth
});
