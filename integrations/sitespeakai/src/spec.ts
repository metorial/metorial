import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sitespeakai',
  name: 'SiteSpeakAI',
  description:
    'AI chatbot platform for creating custom-trained GPT chatbots using your own content. Deploy chatbots on websites and messaging platforms to automate customer support, capture leads, and provide real-time answers.',
  metadata: {},
  config,
  auth
});
