import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAssociate,
  listAccessibleCompanies,
  listAccessibleCustomers,
  listChartOfAccounts,
  listOrders,
  searchAssociates
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listAccessibleCustomers,
    listAccessibleCompanies,
    searchAssociates,
    getAssociate,
    listChartOfAccounts,
    listOrders
  ],
  triggers: []
});
