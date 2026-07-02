import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'botsonic',
  name: 'Botsonic',
  description:
    'Build and manage custom AI chatbots trained on your own data. Generate AI-powered responses, manage bots, upload training data, configure FAQs and starter questions, and retrieve conversation history.',
  metadata: {},
  config,
  auth
});
