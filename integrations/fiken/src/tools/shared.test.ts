import { describe, expect, test } from 'vitest';
import { mapContact, mapInvoice, mapInvoiceDraft } from './shared';

describe('mapContact', () => {
  test('maps documented detailed contact fields', () => {
    let contact = mapContact({
      contactId: 2747365,
      name: 'Fiken AS',
      email: 'kontakt@fiken.gmail',
      bankAccountNumber: '11112233334',
      customer: true,
      supplier: true,
      daysUntilInvoicingDueDate: 15,
      discount: 25.5,
      groups: ['customers', 'vip'],
      documents: [
        {
          identifier: '24760',
          downloadUrl: 'https://api.fiken.no/api/v2/files/example.pdf',
          downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/example.pdf',
          comment: 'Invoice attachment',
          type: 'invoice'
        }
      ],
      notes: [
        {
          author: 'Betty Boop',
          note: 'Garage 45'
        }
      ],
      contactPerson: [
        {
          contactPersonId: 123,
          name: 'Betty Boop',
          email: 'bb@gmail.com',
          phoneNumber: '98573564',
          address: {
            streetAddress: 'Karl Johan 34',
            city: 'Oslo',
            postCode: '0550',
            country: 'Norway'
          }
        }
      ]
    });

    expect(contact).toMatchObject({
      contactId: 2747365,
      name: 'Fiken AS',
      bankAccountNumber: '11112233334',
      customer: true,
      supplier: true,
      daysUntilInvoicingDueDate: 15,
      discount: 25.5,
      groups: ['customers', 'vip'],
      groupCount: 2,
      documentCount: 1,
      documents: [
        {
          identifier: '24760',
          type: 'invoice',
          comment: 'Invoice attachment'
        }
      ],
      notes: [
        {
          author: 'Betty Boop',
          note: 'Garage 45'
        }
      ],
      contactPerson: [
        {
          contactPersonId: 123,
          name: 'Betty Boop',
          email: 'bb@gmail.com',
          phoneNumber: '98573564',
          address: {
            streetAddress: 'Karl Johan 34',
            city: 'Oslo',
            postCode: '0550',
            country: 'Norway'
          }
        }
      ]
    });
  });
});

describe('mapInvoice', () => {
  test('maps documented detailed invoice fields', () => {
    let invoice = mapInvoice({
      invoiceId: 2888156,
      invoiceNumber: 10001,
      issueDate: '2018-04-03',
      dueDate: '2018-04-17',
      originalDueDate: '2018-04-17',
      createdDate: '2023-04-03',
      lastModifiedDate: '2023-04-04',
      kid: '5855454756',
      net: 25000,
      vat: 5000,
      gross: 30000,
      netInNok: 25000,
      vatInNok: 5000,
      grossInNok: 30000,
      cash: false,
      invoiceText: 'Invoice for services rendered.',
      yourReference: 'Betty Boop',
      ourReference: 'Koko',
      orderReference: 'order-123',
      invoiceDraftUuid: '123e4567-e89b-12d3-a456-426655440000',
      currency: 'NOK',
      bankAccountNumber: '11112233334',
      sentManually: false,
      associatedCreditNotes: [42],
      lines: [
        {
          net: 4500,
          vat: 500,
          vatType: 'HIGH',
          gross: 5000,
          netInNok: 4500,
          vatInNok: 500,
          grossInNok: 5000,
          vatInPercent: 25,
          unitPrice: 4550,
          quantity: 5,
          discount: 25,
          productId: 2888156,
          productName: 'Gardening Gloves VI2',
          description: 'Goatskin, with extra-long suede cuffs',
          comment: 'One size fits all',
          incomeAccount: '3000'
        }
      ],
      invoicePdf: {
        identifier: '2888156',
        downloadUrl: 'https://api.fiken.no/api/v2/files/invoice.pdf',
        downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/invoice.pdf',
        comment: 'Invoice PDF',
        type: 'invoice'
      },
      attachments: [
        {
          identifier: '24760',
          downloadUrl: 'https://api.fiken.no/api/v2/files/example.pdf',
          downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/example.pdf',
          comment: 'Invoice attachment',
          type: 'invoice'
        }
      ],
      customer: {
        contactId: 2747365,
        name: 'Fiken AS'
      },
      sale: {
        saleId: 123456
      },
      project: {
        projectId: 15124866
      }
    });

    expect(invoice).toMatchObject({
      invoiceId: 2888156,
      invoiceNumber: 10001,
      invoiceText: 'Invoice for services rendered.',
      yourReference: 'Betty Boop',
      ourReference: 'Koko',
      bankAccountNumber: '11112233334',
      customerId: 2747365,
      customerName: 'Fiken AS',
      saleId: 123456,
      projectId: 15124866,
      associatedCreditNotes: [42],
      lineCount: 1,
      attachmentCount: 2,
      lines: [
        {
          productId: 2888156,
          productName: 'Gardening Gloves VI2',
          net: 4500,
          vat: 500,
          gross: 5000,
          netInNok: 4500,
          vatInNok: 500,
          grossInNok: 5000,
          vatInPercent: 25,
          unitPrice: 4550,
          quantity: 5,
          discount: 25,
          vatType: 'HIGH',
          incomeAccount: '3000'
        }
      ],
      invoicePdf: {
        identifier: '2888156',
        type: 'invoice',
        comment: 'Invoice PDF'
      },
      attachments: [
        {
          identifier: '24760',
          type: 'invoice',
          comment: 'Invoice attachment'
        }
      ]
    });
  });
});

describe('mapInvoiceDraft', () => {
  test('maps documented invoice draft result fields', () => {
    let draft = mapInvoiceDraft({
      draftId: 2888156,
      uuid: '123e4567-e89b-12d3-a456-426655440000',
      type: 'invoice',
      lastModifiedDate: '2023-04-03',
      issueDate: '2018-04-03',
      daysUntilDueDate: 15,
      invoiceText: 'Invoice for services rendered.',
      currency: 'NOK',
      yourReference: 'Betty Boop',
      ourReference: 'Koko',
      orderReference: 'order-123',
      net: 4500,
      gross: 5000,
      bankAccountNumber: '11112233334',
      iban: 'NO49 1111 2233 334',
      bic: 'DNBANOKKXXX',
      paymentAccount: '1920:10001',
      createdFromInvoiceId: 73408306,
      customers: [
        {
          contactId: 2747365,
          name: 'Fiken AS',
          customer: true
        }
      ],
      lines: [
        {
          invoiceishDraftLineId: 2888157,
          lastModifiedDate: '2023-04-03',
          productId: 2888156,
          description: 'Goatskin, with extra-long suede cuffs',
          unitPrice: 4550,
          vatType: 'HIGH',
          quantity: 5,
          discount: 25,
          comment: 'One size fits all',
          incomeAccount: '3000'
        }
      ],
      attachments: [
        {
          identifier: '24760',
          downloadUrl: 'https://api.fiken.no/api/v2/files/example.pdf',
          downloadUrlWithFikenNormalUserCredentials: 'https://fiken.no/files/example.pdf',
          comment: 'Invoice attachment',
          type: 'invoice'
        }
      ],
      projectId: 73408306,
      roundingType: 'none'
    });

    expect(draft).toMatchObject({
      draftId: 2888156,
      uuid: '123e4567-e89b-12d3-a456-426655440000',
      type: 'invoice',
      lastModifiedDate: '2023-04-03',
      issueDate: '2018-04-03',
      daysUntilDueDate: 15,
      invoiceText: 'Invoice for services rendered.',
      currency: 'NOK',
      yourReference: 'Betty Boop',
      ourReference: 'Koko',
      orderReference: 'order-123',
      net: 4500,
      gross: 5000,
      bankAccountNumber: '11112233334',
      iban: 'NO49 1111 2233 334',
      bic: 'DNBANOKKXXX',
      paymentAccount: '1920:10001',
      createdFromInvoiceId: 73408306,
      customerCount: 1,
      customers: [
        {
          contactId: 2747365,
          name: 'Fiken AS',
          customer: true
        }
      ],
      lineCount: 1,
      lines: [
        {
          draftLineId: 2888157,
          lastModifiedDate: '2023-04-03',
          productId: 2888156,
          description: 'Goatskin, with extra-long suede cuffs',
          unitPrice: 4550,
          vatType: 'HIGH',
          quantity: 5,
          discount: 25,
          comment: 'One size fits all',
          incomeAccount: '3000'
        }
      ],
      attachmentCount: 1,
      attachments: [
        {
          identifier: '24760',
          type: 'invoice',
          comment: 'Invoice attachment'
        }
      ],
      projectId: 73408306,
      roundingType: 'none'
    });
  });
});
