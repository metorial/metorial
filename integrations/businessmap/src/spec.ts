import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'kanbanize',
  name: 'Kanbanize',
  description:
    'Kanban-based project management and workflow platform for enterprise agility, consolidating Project Portfolio Management, OKRs, and Work Management.',
  metadata: {},
  config,
  auth
});
