import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTransfer,
  downloadExpenseReceipt,
  getCurrentUser,
  getFileUrl,
  getResource,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getResource,
    downloadExpenseReceipt,
    getFileUrl,
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
  triggers: []
});
