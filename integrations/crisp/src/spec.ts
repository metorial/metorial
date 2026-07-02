import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'crisp',
  name: 'Crisp',
  description:
    'Crisp is a multichannel customer messaging platform with live chat, CRM, helpdesk, and campaign tools.',
  metadata: {},
  config,
  auth
});
