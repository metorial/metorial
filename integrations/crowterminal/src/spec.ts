import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'crowterminal',
  name: 'CrowTerminal',
  description:
    'Post and schedule content to social media platforms including TikTok, X (Twitter), and Instagram. CrowTerminal operates as a social media publishing skill within the OpenClaw agent framework, enabling cross-platform content automation.',
  metadata: {},
  config,
  auth
});
