import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tisane',
  name: 'Tisane',
  description:
    'Natural language processing API that analyzes text to detect abusive content, extract sentiment, entities, and topics across 30+ languages.',
  metadata: {},
  config,
  auth
});
