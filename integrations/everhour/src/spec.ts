import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'everhour',
  name: 'Everhour',
  description:
    'Time tracking software with project budgeting, resource planning, expense tracking, invoicing, and reporting. Integrates with Asana, Jira, ClickUp, Monday, Trello, and more.',
  metadata: {},
  config,
  auth
});
