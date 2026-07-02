import { Slate } from 'slates';
import { spec } from './spec';
import {
  assignThread,
  changeThreadPriority,
  createThread,
  createTimelineEvent,
  deleteCustomer,
  getCustomer,
  getThread,
  listCustomerGroups,
  listCustomers,
  listLabelTypes,
  listThreads,
  manageCustomerGroups,
  manageCustomerTenants,
  manageThreadLabels,
  replyToThread,
  sendEmail,
  updateCustomerCompany,
  updateThreadStatus,
  upsertCustomer,
  upsertTenant
} from './tools';
import { customerEvents, messageEvents, threadEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    upsertCustomer,
    getCustomer,
    listCustomers,
    deleteCustomer,
    updateCustomerCompany,
    createThread,
    getThread,
    listThreads,
    updateThreadStatus,
    assignThread,
    changeThreadPriority,
    replyToThread,
    manageThreadLabels,
    listLabelTypes,
    sendEmail,
    createTimelineEvent,
    upsertTenant,
    manageCustomerTenants,
    manageCustomerGroups,
    listCustomerGroups
  ],
  triggers: [threadEvents, messageEvents, customerEvents]
});
