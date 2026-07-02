import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAccount,
  createTransaction,
  deleteTransaction,
  getBudget,
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
import { accountChanges, inboundWebhook, transactionChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, transactionChanges, accountChanges]
});
