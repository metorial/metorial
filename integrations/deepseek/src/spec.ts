import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deepseek',
  name: 'DeepSeek',
  description:
    'AI company providing cloud-based API access to large language models for chat, reasoning, and code completion. Compatible with OpenAI API format.',
  metadata: {},
  config,
  auth
});
