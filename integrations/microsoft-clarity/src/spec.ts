import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'microsoft-clarity',
  name: 'Microsoft Clarity',
  description:
    'Retrieve Microsoft Clarity dashboard metrics, query traffic and behavioral analytics, and sample session recordings for the connected project.',
  metadata: {},
  config,
  auth
});
