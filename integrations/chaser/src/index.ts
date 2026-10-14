import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkUpsertCustomers,
  bulkUpsertInvoices,
  deleteContactPerson,
  getCustomer,
  getInvoice,
  getOrganisation,
  listContactPersons,
  listCreditNotes,
  listCustomers,
  listInvoices,
  listOverpayments,
  setCustomerChasing,
  setInvoiceChasing,
  setOrganisationChasing,
  syncOrganisation,
  upsertContactPerson,
  upsertCreditNote,
  upsertCustomer,
  upsertInvoice,
  upsertOverpayment
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    upsertCustomer,
    getCustomer,
    listCustomers,
    bulkUpsertCustomers,
    upsertContactPerson,
    listContactPersons,
    deleteContactPerson,
    upsertInvoice,
    getInvoice,
    listInvoices,
    bulkUpsertInvoices,
    upsertCreditNote,
    listCreditNotes,
    upsertOverpayment,
    listOverpayments,
    getOrganisation,
    syncOrganisation,
    setCustomerChasing,
    setInvoiceChasing,
    setOrganisationChasing
  ],
  triggers: []
});
