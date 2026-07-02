import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kontentai',
  name: 'Kontent.ai',
  description:
    'Headless CMS for creating, managing, and delivering structured content through REST APIs. Supports multi-language content, customizable workflows, taxonomy management, and asset management.',
  metadata: {},
  config,
  auth
});
