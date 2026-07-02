import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateEorCost,
  createContract,
  getContract,
  getEorCountryGuide,
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
import {
  contractEvents,
  invoiceAdjustmentEvents,
  paymentEvents,
  timeOffEvents,
  timesheetEvents,
  workerEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [
    contractEvents,
    workerEvents,
    timesheetEvents,
    timeOffEvents,
    paymentEvents,
    invoiceAdjustmentEvents
  ]
});
