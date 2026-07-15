import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gemini',
  name: 'Gemini',
  description:
    "Google's multimodal generative AI platform providing text, image, and Veo video generation, multimodal understanding, embeddings, code execution, and context caching through a REST API.",
  metadata: {},
  config,
  auth
});
