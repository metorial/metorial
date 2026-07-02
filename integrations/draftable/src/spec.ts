import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'draftable',
  name: 'Draftable',
  description:
    'Document comparison service that identifies differences between two documents, detecting changes in text, formatting, and layout across Word, PowerPoint, RTF, Excel, PDF, and text documents.',
  metadata: {},
  config,
  auth
});
