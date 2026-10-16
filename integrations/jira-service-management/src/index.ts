import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCommentTool,
  createCustomerRequestTool,
  createIssueTool,
  deleteIssueTool,
  getCurrentUserTool,
  getCustomerRequestTool,
  getIssueTool,
  getSlaInformationTool,
  listCustomerRequestsTool,
  listProjectsTool,
  listRequestTypesTool,
  listServiceDesksTool,
  manageApprovalTool,
  manageCustomerTool,
  manageOrganizationTool,
  manageQueueTool,
  searchIssuesTool,
  searchKnowledgeBaseTool,
  searchUsersTool,
  updateIssueTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUserTool,
    getCustomerRequestTool,
    listCustomerRequestsTool,
    searchIssuesTool,
    getIssueTool,
    createIssueTool,
    updateIssueTool,
    deleteIssueTool,
    addCommentTool,
    createCustomerRequestTool,
    listServiceDesksTool,
    listRequestTypesTool,
    manageQueueTool,
    manageApprovalTool,
    getSlaInformationTool,
    manageOrganizationTool,
    manageCustomerTool,
    searchKnowledgeBaseTool,
    listProjectsTool,
    searchUsersTool
  ],
  triggers: []
});
