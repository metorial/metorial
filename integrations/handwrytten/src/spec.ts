import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'handwrytten',
  name: 'Handwrytten',
  description:
    'Send physical handwritten notes and cards using robotic pens with real ink. Automate personalized mail for marketing, thank-you notes, and customer outreach.',
  metadata: {},
  config,
  auth
});
