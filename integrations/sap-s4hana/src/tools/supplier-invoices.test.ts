import { describe, expect, it } from 'vitest';
import {
  buildSupplierInvoiceFilters,
  mapSupplierInvoice,
  supplierInvoiceItemNavigation
} from './supplier-invoices';

describe('SAP S/4HANA supplier invoice tool helpers', () => {
  it('uses the documented purchase-order reference item navigation', () => {
    expect(supplierInvoiceItemNavigation).toBe('to_SuplrInvcItemPurOrdRef');
  });

  it('maps documented purchase-order reference item expansions', () => {
    let invoice = mapSupplierInvoice({
      SupplierInvoice: '5105600041',
      FiscalYear: '2026',
      InvoicingParty: '10300001',
      to_SuplrInvcItemPurOrdRef: {
        results: [
          {
            SupplierInvoice: '5105600041',
            FiscalYear: '2026',
            SupplierInvoiceItem: '000001',
            PurchaseOrder: '4500000010',
            PurchaseOrderItem: '00010',
            Plant: '1010',
            ProductType: '1',
            SupplierInvoiceItemAmount: '125.500',
            DocumentCurrency: 'USD',
            AmountInDocumentCurrency: '999.000',
            Material: 'not-a-documented-field-on-this-entity'
          }
        ]
      }
    });

    expect(invoice.items).toEqual([
      expect.objectContaining({
        supplierInvoice: '5105600041',
        fiscalYear: '2026',
        supplierInvoiceItem: '000001',
        purchaseOrder: '4500000010',
        purchaseOrderItem: '00010',
        plant: '1010',
        productType: '1',
        amountInDocumentCurrency: '125.500',
        documentCurrency: 'USD'
      })
    ]);
    expect(invoice.items?.[0]).not.toHaveProperty('material');
  });

  it('builds documented supplier invoice filters', () => {
    expect(
      buildSupplierInvoiceFilters({
        supplierInvoice: '5105600041',
        fiscalYear: '2026',
        supplier: '10300001',
        companyCode: '1010',
        postingDateFrom: '2026-01-02',
        postingDateTo: '2026-01-31'
      })
    ).toBe(
      "SupplierInvoice eq '5105600041' and FiscalYear eq '2026' and InvoicingParty eq '10300001' and CompanyCode eq '1010' and PostingDate ge datetime'2026-01-02T00:00:00' and PostingDate le datetime'2026-01-31T00:00:00'"
    );
  });
});
