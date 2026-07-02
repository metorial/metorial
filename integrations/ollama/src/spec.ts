import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ollama',
  name: 'Ollama',
  description:
    'Run and manage large language models locally or via Ollama Cloud. Generate text completions, chat with models, create embeddings, and manage your model library.',
  metadata: {},
  config,
  auth
});
