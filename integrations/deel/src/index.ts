import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateEorCost,
  createContract,
  downloadInvoice,
  getContract,
  getCurrentOrganization,
  getCurrentUser,
  getEorCountryGuide,
  getFileUrl,
  getPerson,
  listContracts,
  listInvoices,
  listOrganizationData,
  listPayments,
  listPeople,
  manageContract,
  manageInvoiceAdjustments,
  manageTimeOff,
  manageTimesheets
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getCurrentOrganization,
    downloadInvoice,
    getFileUrl,
    listContracts,
    getContract,
    createContract,
    manageContract,
    listPeople,
    getPerson,
    manageTimesheets,
    manageTimeOff,
    manageInvoiceAdjustments,
    listInvoices,
    listPayments,
    listOrganizationData,
    getEorCountryGuide,
    calculateEorCost
  ],
  triggers: []
});
