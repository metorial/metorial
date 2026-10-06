import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAccount,
  createPayee,
  createTransaction,
  deleteTransaction,
  getBudget,
  getCurrentUser,
  getMonth,
  getTransaction,
  importTransactions,
  listAccounts,
  listBudgets,
  listCategories,
  listMonths,
  listPayees,
  listScheduledTransactions,
  listTransactions,
  manageCategory,
  manageCategoryGroup,
  manageScheduledTransaction,
  updatePayee,
  updateTransaction
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    createPayee,
    listBudgets,
    getBudget,
    listAccounts,
    createAccount,
    listTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    importTransactions,
    listScheduledTransactions,
    manageScheduledTransaction,
    listCategories,
    manageCategory,
    manageCategoryGroup,
    listPayees,
    updatePayee,
    listMonths,
    getMonth
  ],
  triggers: []
});
