import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBusiness,
  getReimbursement,
  getTransaction,
  listBills,
  listCards,
  listEntities,
  listReimbursements,
  listTransactions,
  listUsers,
  listVendors,
  manageBill,
  manageCard,
  manageDepartment,
  manageLimit,
  manageSpendProgram,
  manageUser
} from './tools';
import {
  billEvents,
  inboundWebhook,
  reimbursementEvents,
  transactionEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTransactions,
    getTransaction,
    listUsers,
    manageUser,
    listCards,
    manageCard,
    listBills,
    manageBill,
    listReimbursements,
    getReimbursement,
    manageDepartment,
    manageLimit,
    manageSpendProgram,
    getBusiness,
    listVendors,
    listEntities
  ],
  triggers: [inboundWebhook, transactionEvents, billEvents, reimbursementEvents]
});
