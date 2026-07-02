import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'procfu',
  name: 'ProcFu',
  description:
    'ProcFu is a powerful add-on for Citrix Podio that enhances Podio Workflow Automations. Its Functions API provides 300+ endpoints for managing Podio items, files, comments, workspaces, and integrating with services like Google, MySQL, Notion, and more.',
  metadata: {},
  config,
  auth
});
