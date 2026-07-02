import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'amcards',
  name: 'Amcards',
  description:
    'Send personalized physical greeting cards, schedule drip campaigns, and manage contacts through AMcards.',
  metadata: {},
  config,
  auth
});
