import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'botbaba',
  name: 'Botbaba',
  description:
    'No-code chatbot platform for creating WhatsApp and web chatbots, focused on e-commerce and lead generation.',
  metadata: {},
  config,
  auth
});
