import { Slate } from 'slates';
import { spec } from './spec';
import {
  addNoteTool,
  createCompanyTool,
  createContactTool,
  createLeadTool,
  createTaskTool,
  getAccountTool,
  getCompanyTool,
  getContactTool,
  getLeadTool,
  listCompaniesTool,
  listContactsTool,
  listCustomFieldsTool,
  listEventsTool,
  listLeadsTool,
  listNotesTool,
  listPipelinesTool,
  listTasksTool,
  listUsersTool,
  manageEntityLinksTool,
  manageTagsTool,
  updateCompanyTool,
  updateContactTool,
  updateLeadTool,
  updateTaskTool
} from './tools';
import {
  companyEventsTrigger,
  contactEventsTrigger,
  leadEventsTrigger,
  taskEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listLeadsTool,
    getLeadTool,
    createLeadTool,
    updateLeadTool,
    listContactsTool,
    getContactTool,
    createContactTool,
    updateContactTool,
    listCompaniesTool,
    getCompanyTool,
    createCompanyTool,
    updateCompanyTool,
    listTasksTool,
    createTaskTool,
    updateTaskTool,
    listPipelinesTool,
    addNoteTool,
    listNotesTool,
    manageTagsTool,
    listUsersTool,
    listCustomFieldsTool,
    manageEntityLinksTool,
    getAccountTool,
    listEventsTool
  ],
  triggers: [leadEventsTrigger, contactEventsTrigger, companyEventsTrigger, taskEventsTrigger]
});
