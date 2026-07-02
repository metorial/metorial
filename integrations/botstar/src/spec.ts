import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'botstar',
  name: 'Botstar',
  description:
    'BotStar is a chatbot development platform for building and deploying chatbots on websites and Facebook Messenger with a visual flow editor, CMS, and audience management.',
  metadata: {},
  config,
  auth
});
