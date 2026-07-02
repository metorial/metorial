import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'neuronwriter',
  name: 'NeuronWriter',
  description:
    'Content optimization tool using semantic SEO and NLP to analyze top-performing content and provide actionable recommendations for keyword usage, content structure, and readability.',
  metadata: {},
  config,
  auth
});
