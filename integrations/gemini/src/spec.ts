import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gemini',
  name: 'Gemini',
  description:
    "Google's multimodal generative AI platform providing text generation, multimodal understanding, image generation, embeddings, code execution, and context caching through a REST API.",
  metadata: {},
  config,
  auth
});
