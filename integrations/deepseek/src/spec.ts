import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deepseek',
  name: 'DeepSeek',
  description:
    'AI company providing OpenAI-compatible API access to DeepSeek V4 models for chat, thinking-mode reasoning, tool calling, and code completion.',
  metadata: {},
  config,
  auth
});
