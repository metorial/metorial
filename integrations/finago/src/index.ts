import { Slate } from 'slates';
import { spec } from './spec';
import {
  finagoCreateSalesOrder,
  finagoGetAccountBalances,
  finagoGetDocument,
  finagoGetFileUploadStatus,
  finagoGetProfile,
  finagoGetSalesOrder,
  finagoListAccounts,
  finagoListCustomers,
  finagoListProducts,
  finagoListReferenceData,
  finagoListSalesOrders,
  finagoListTransactionLines,
  finagoUploadTransactionFile,
  finagoUpsertCustomer,
  finagoUpsertProduct
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    finagoGetProfile,
    finagoListAccounts,
    finagoListReferenceData,
    finagoListCustomers,
    finagoUpsertCustomer,
    finagoListProducts,
    finagoUpsertProduct,
    finagoListSalesOrders,
    finagoGetSalesOrder,
    finagoCreateSalesOrder,
    finagoListTransactionLines,
    finagoGetAccountBalances,
    finagoUploadTransactionFile,
    finagoGetFileUploadStatus,
    finagoGetDocument
  ],
  triggers: []
});
