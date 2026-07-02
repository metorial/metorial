import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'metatextai',
  name: 'Metatext AI',
  description:
    'Classify, extract, and generate text using custom and pre-built NLP models powered by Metatext AI.',
  metadata: {},
  config,
  auth
});
