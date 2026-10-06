import { Slate } from 'slates';
import { spec } from './spec';
import {
  createContactLogTool,
  createContactTool,
  createJobMessageTool,
  createJobTool,
  getCompanySettingsTool,
  getContactTool,
  getEstimatesTool,
  getInvoicesTool,
  getJobFinancialsTool,
  getJobTool,
  getLeadHistoryTool,
  getSupplementsTool,
  getUsersTool,
  listContactsTool,
  listJobsTool,
  manageAppointmentsTool,
  manageJobInsuranceTool,
  manageJobRepresentativesTool,
  managePaymentsTool,
  searchContactsTool,
  searchJobsTool,
  uploadJobFileTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listJobsTool,
    getJobTool,
    createJobTool,
    searchJobsTool,
    manageJobRepresentativesTool,
    manageJobInsuranceTool,
    listContactsTool,
    getContactTool,
    createContactTool,
    searchContactsTool,
    createContactLogTool,
    getEstimatesTool,
    getInvoicesTool,
    getJobFinancialsTool,
    managePaymentsTool,
    manageAppointmentsTool,
    uploadJobFileTool,
    createJobMessageTool,
    getSupplementsTool,
    getUsersTool,
    getCompanySettingsTool,
    getLeadHistoryTool
  ],
  triggers: []
});
