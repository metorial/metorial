import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTransfer,
  listAccounts,
  listBudgets,
  listCards,
  listDepartmentsLocations,
  listExpenses,
  listTransactions,
  listTransfers,
  listUsers,
  listVendors,
  manageBudget,
  manageCard,
  manageUser,
  manageVendor,
  updateExpense
} from './tools';
import { brexEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listUsers,
    manageUser,
    listCards,
    manageCard,
    listExpenses,
    updateExpense,
    listVendors,
    manageVendor,
    createTransfer,
    listTransfers,
    listBudgets,
    manageBudget,
    listTransactions,
    listAccounts,
    listDepartmentsLocations
  ],
  triggers: [brexEvents]
});
