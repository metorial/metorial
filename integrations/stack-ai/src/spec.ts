import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stack-ai',
  name: 'Stack AI',
  description:
    'Run published Stack AI workflows, upload files to workflow Files Nodes or knowledge bases, retrieve run analytics, and use existing knowledge-base, connection, conversation, folder, and action management tools.',
  metadata: {},
  config,
  auth
});
