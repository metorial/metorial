import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBusiness,
  getReimbursement,
  getResource,
  getTaskStatus,
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
    getResource,
    getTaskStatus,
    listVendors,
    listEntities
  ],
  triggers: []
});
