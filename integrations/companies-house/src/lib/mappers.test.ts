import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  mapAdvancedCompanySearchEnvelope,
  mapChargeRecord,
  mapCompanyRecord,
  mapDocumentMetadata,
  mapFilingRecord,
  mapOfficerRecord,
  mapPscRecord,
  parseDisqualifiedOfficerLink,
  parseDocumentIdFromLink,
  parseOfficerIdFromLink,
  parsePscLink
} from './mappers';

describe('Companies House record mappers', () => {
  it('maps stable company fields and preserves the original record', () => {
    let record = {
      company_name: 'Example Limited',
      company_number: '01234567',
      company_status: 'future-status',
      company_type: 'future-type',
      company_subtype: 'future-subtype',
      date_of_creation: '2020-01-02',
      registered_office_address: {
        address_line_1: '1 Example Street',
        postal_code: 'SW1A 1AA',
        future_address_field: true
      },
      future_field: { retained: true }
    };

    expect(mapCompanyRecord(record)).toEqual({
      companyNumber: '01234567',
      name: 'Example Limited',
      status: 'future-status',
      type: 'future-type',
      subtype: 'future-subtype',
      createdOn: '2020-01-02',
      ceasedOn: undefined,
      address: {
        addressLine1: '1 Example Street',
        postalCode: 'SW1A 1AA',
        record: record.registered_office_address
      },
      record
    });
  });

  it('maps stable officer, filing, charge, and PSC fields', () => {
    let officer = {
      name: 'DOE, Jane',
      officer_role: 'director',
      appointed_on: '2021-02-03',
      resigned_on: '2024-05-06',
      links: { self: '/officers/officer-123/appointments' },
      future_field: 1
    };
    expect(mapOfficerRecord(officer)).toMatchObject({
      officerId: 'officer-123',
      name: 'DOE, Jane',
      role: 'director',
      appointedOn: '2021-02-03',
      resignedOn: '2024-05-06',
      record: officer
    });

    let naturalDisqualification = {
      title: 'Mr',
      forename: 'John',
      surname: 'Doe',
      links: { self: '/disqualified-officers/natural/natural-123' }
    };
    expect(mapOfficerRecord(naturalDisqualification)).toMatchObject({
      officerId: 'natural-123',
      officerType: 'natural',
      name: 'John Doe',
      record: naturalDisqualification
    });

    let filing = {
      transaction_id: 'tx-123',
      category: 'accounts',
      date: '2024-01-31',
      description: 'accounts-made-up-to',
      type: 'AA',
      links: {
        document_metadata:
          'https://document-api.company-information.service.gov.uk/document/doc-123'
      },
      future_field: 2
    };
    expect(mapFilingRecord(filing)).toMatchObject({
      transactionId: 'tx-123',
      documentId: 'doc-123',
      category: 'accounts',
      date: '2024-01-31',
      description: 'accounts-made-up-to',
      type: 'AA',
      record: filing
    });

    let charge = {
      id: 'charge-123',
      charge_number: 1,
      status: 'outstanding',
      created_on: '2022-03-04',
      delivered_on: '2022-03-05',
      classification: [{ description: 'Fixed charge', type: 'charge-description' }],
      future_field: 3
    };
    expect(mapChargeRecord(charge)).toMatchObject({
      chargeId: 'charge-123',
      status: 'outstanding',
      createdOn: '2022-03-04',
      deliveredOn: '2022-03-05',
      classification: [
        {
          description: 'Fixed charge',
          type: 'charge-description',
          record: charge.classification[0]
        }
      ],
      record: charge
    });

    let psc = {
      name: 'Example Holdings Limited',
      kind: 'corporate-entity-person-with-significant-control',
      notified_on: '2023-01-01',
      natures_of_control: ['ownership-of-shares-75-to-100-percent'],
      links: {
        self: '/company/01234567/persons-with-significant-control/corporate-entity/psc-123'
      },
      future_field: 4
    };
    expect(mapPscRecord(psc)).toMatchObject({
      notificationId: 'psc-123',
      name: 'Example Holdings Limited',
      kind: 'corporate-entity-person-with-significant-control',
      notifiedOn: '2023-01-01',
      naturesOfControl: ['ownership-of-shares-75-to-100-percent'],
      record: psc
    });
  });

  it('maps document metadata and its advertised representations', () => {
    let record = {
      etag: 'etag-1',
      id: 'doc-123',
      company_number: '01234567',
      created_at: '2024-01-02T03:04:05Z',
      pages: 3,
      links: { self: '/document/doc-123', document: '/document/doc-123/content' },
      resources: {
        'application/pdf': { content_length: 1234, created_at: '2024-01-02T03:04:05Z' },
        'text/csv': { content_length: 55, future_field: true }
      },
      future_field: true
    };

    expect(mapDocumentMetadata(record)).toEqual({
      documentId: 'doc-123',
      companyNumber: '01234567',
      createdAt: '2024-01-02T03:04:05Z',
      pages: 3,
      availableContentTypes: [
        {
          mimeType: 'application/pdf',
          contentLength: 1234,
          createdAt: '2024-01-02T03:04:05Z',
          record: record.resources['application/pdf']
        },
        {
          mimeType: 'text/csv',
          contentLength: 55,
          record: record.resources['text/csv']
        }
      ],
      links: record.links,
      resources: {
        'application/pdf': {
          contentLength: 1234,
          createdAt: '2024-01-02T03:04:05Z',
          record: record.resources['application/pdf']
        },
        'text/csv': {
          contentLength: 55,
          record: record.resources['text/csv']
        }
      },
      record
    });
  });
});

describe('Companies House advanced-search envelope mapper', () => {
  it('converts hits and echoes normalized requested pagination', () => {
    let result = mapAdvancedCompanySearchEnvelope(
      {
        hits: '42',
        items: [{ company_name: 'Example Limited', company_number: '01234567' }],
        future_field: true
      },
      { itemsPerPage: 20, startIndex: 5 }
    );

    expect(result).toMatchObject({
      totalResults: 42,
      itemsPerPage: 20,
      startIndex: 5,
      items: [{ companyNumber: '01234567', name: 'Example Limited' }]
    });
  });

  it.each([
    '-1',
    '+1',
    '01',
    '1.5',
    '1e3',
    '',
    '9007199254740992'
  ])('rejects malformed or unsafe hits %j', hits => {
    expect(() =>
      mapAdvancedCompanySearchEnvelope(
        { hits, items: [] },
        { itemsPerPage: 20, startIndex: 0 }
      )
    ).toThrow(ServiceError);
  });
});

describe('Companies House fixed-link parsers', () => {
  it('parses documented officer, disqualification, document, and PSC links', () => {
    expect(parseOfficerIdFromLink('/officers/officer%20123/appointments')).toBe('officer 123');
    expect(
      parseDisqualifiedOfficerLink('/disqualified-officers/natural/natural%2F123')
    ).toEqual({ officerType: 'natural', officerId: 'natural/123' });
    expect(
      parseDisqualifiedOfficerLink(
        'https://api.company-information.service.gov.uk/disqualified-officers/corporate/corp-123'
      )
    ).toEqual({ officerType: 'corporate', officerId: 'corp-123' });
    expect(
      parseDocumentIdFromLink(
        'https://document-api.company-information.service.gov.uk/document/document%20123'
      )
    ).toBe('document 123');
    expect(
      parsePscLink('/company/01234567/persons-with-significant-control/individual/psc%20123')
    ).toEqual({
      companyNumber: '01234567',
      kind: 'individual',
      pscId: 'psc 123',
      resourceType: 'psc'
    });
    expect(
      parsePscLink('/company/01234567/persons-with-significant-control-statements/statement-1')
    ).toEqual({
      companyNumber: '01234567',
      pscId: 'statement-1',
      resourceType: 'statement'
    });
  });

  it.each([
    ['officer', '/officers/officer-123'],
    ['officer extra path', '/officers/officer-123/appointments/extra'],
    ['disqualification discriminator', '/disqualified-officers/unknown/officer-123'],
    ['document content path', '/document/doc-123/content'],
    ['document wrong host', 'https://example.com/document/doc-123'],
    ['PSC missing subtype', '/company/01234567/persons-with-significant-control/psc-123'],
    [
      'PSC extra path',
      '/company/01234567/persons-with-significant-control/individual/psc-123/extra'
    ]
  ])('returns undefined when the documented %s link shape changes', (kind, link) => {
    let parser = kind.startsWith('officer')
      ? parseOfficerIdFromLink
      : kind.startsWith('disqualification')
        ? parseDisqualifiedOfficerLink
        : kind.startsWith('document')
          ? parseDocumentIdFromLink
          : parsePscLink;
    expect(parser(link)).toBeUndefined();
  });
});
