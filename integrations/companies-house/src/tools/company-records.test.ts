import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompaniesHouseClient } from '../lib/client';
import {
  mapChargeListEnvelope,
  mapChargeRecord,
  mapCompanyInsolvency,
  mapPscListEnvelope,
  mapPscRecord,
  mapPscStatementListEnvelope,
  mapPscStatementRecord
} from '../lib/mappers';
import { getCompanyCharge, listCompanyCharges } from './charges';
import { getCompanyInsolvency } from './insolvency';
import { listCompanyPscs, listPscStatements } from './psc';

let context = <T>(input: T) => ({ input, auth: { token: 'secret-key' }, config: {} }) as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('company record tool contracts', () => {
  it('uses exact keys and read-only tags', () => {
    for (let [tool, key] of [
      [listCompanyCharges, 'list_company_charges'],
      [getCompanyCharge, 'get_company_charge'],
      [getCompanyInsolvency, 'get_company_insolvency'],
      [listCompanyPscs, 'list_company_pscs'],
      [listPscStatements, 'list_psc_statements']
    ] as const) {
      expect(tool.key).toBe(key);
      expect(tool.tags).toEqual({ readOnly: true, destructive: false });
    }
  });

  it('applies bounded charge pagination and defaults PSC register view to false', () => {
    expect(listCompanyCharges.inputSchema.parse({ companyNumber: '01234567' })).toEqual({
      companyNumber: '01234567',
      itemsPerPage: 20,
      startIndex: 0
    });
    expect(listCompanyPscs.inputSchema.parse({ companyNumber: '01234567' })).toEqual({
      companyNumber: '01234567',
      itemsPerPage: 20,
      registerView: false,
      startIndex: 0
    });
    expect(listPscStatements.inputSchema.parse({ companyNumber: '01234567' })).toEqual({
      companyNumber: '01234567',
      itemsPerPage: 20,
      registerView: false,
      startIndex: 0
    });
    expect(
      listCompanyCharges.inputSchema.safeParse({ companyNumber: '01234567', startIndex: -1 })
        .success
    ).toBe(false);
  });
});

describe('charge mapping', () => {
  let charge = {
    acquired_on: '2020-01-01',
    assests_ceased_released: 'part-property-released',
    charge_code: '012345670001',
    charge_number: 1,
    classification: [{ description: 'A registered charge', type: 'charge-description' }],
    covering_instrument_date: '2019-12-31',
    created_on: '2020-01-02',
    delivered_on: '2020-01-03',
    etag: 'etag-1',
    id: 'charge-1',
    insolvency_cases: [
      { case_number: '1', links: [{ case: '/company/01234567/insolvency' }] }
    ],
    links: [{ self: '/company/01234567/charges/charge-1' }],
    more_than_four_persons_entitled: false,
    particulars: [
      {
        chargor_acting_as_bare_trustee: false,
        contains_fixed_charge: true,
        contains_floating_charge: false,
        contains_negative_pledge: true,
        description: 'Land and buildings',
        floating_charge_covers_all: false,
        type: 'charged-property-description'
      }
    ],
    persons_entitled: [{ name: 'EXAMPLE BANK PLC' }],
    resolved_on: '2024-01-01',
    satisfied_on: '2024-01-02',
    secured_details: [{ description: 'All monies due', type: 'obligations-secured' }],
    status: 'future-charge-status',
    transactions: [
      {
        delivered_on: '2020-01-03',
        filing_type: 'MR01',
        insolvency_case_number: '1',
        links: [{ filing: '/company/01234567/filing-history/tx-1' }]
      }
    ],
    future_field: { retained: true }
  };

  it('maps official arrays, nested records, open status values, and transactions', () => {
    expect(mapChargeRecord(charge)).toEqual({
      chargeId: 'charge-1',
      chargeCode: '012345670001',
      chargeNumber: 1,
      status: 'future-charge-status',
      acquiredOn: '2020-01-01',
      assetsCeasedReleased: 'part-property-released',
      coveringInstrumentOn: '2019-12-31',
      createdOn: '2020-01-02',
      deliveredOn: '2020-01-03',
      resolvedOn: '2024-01-01',
      satisfiedOn: '2024-01-02',
      classification: [
        {
          description: 'A registered charge',
          type: 'charge-description',
          record: charge.classification[0]
        }
      ],
      securedDetails: [
        {
          description: 'All monies due',
          type: 'obligations-secured',
          record: charge.secured_details[0]
        }
      ],
      particulars: [
        {
          chargorActingAsBareTrustee: false,
          containsFixedCharge: true,
          containsFloatingCharge: false,
          containsNegativePledge: true,
          description: 'Land and buildings',
          floatingChargeCoversAll: false,
          type: 'charged-property-description',
          record: charge.particulars[0]
        }
      ],
      personsEntitled: [{ name: 'EXAMPLE BANK PLC', record: charge.persons_entitled[0] }],
      moreThanFourPersonsEntitled: false,
      transactions: [
        {
          deliveredOn: '2020-01-03',
          filingType: 'MR01',
          insolvencyCaseNumber: '1',
          links: charge.transactions[0]!.links,
          record: charge.transactions[0]!
        }
      ],
      insolvencyCases: [
        {
          caseNumber: '1',
          links: charge.insolvency_cases[0]!.links,
          record: charge.insolvency_cases[0]!
        }
      ],
      links: charge.links,
      record: charge
    });
  });

  it('parses a charge ID from the official links array when id is absent', () => {
    expect(
      mapChargeRecord({
        charge_number: 2,
        classification: [],
        links: [{ self: '/company/01234567/charges/charge%2F2' }],
        status: 'outstanding'
      })
    ).toMatchObject({ chargeId: 'charge/2' });
  });

  it('maps list counts and uses requested pagination when coordinates are omitted', () => {
    let record = {
      etag: 'etag-list',
      items: [charge],
      total_count: 7,
      satisfied_count: 3,
      part_satisfied_count: 1,
      future_field: true
    };
    expect(
      mapChargeListEnvelope(record, '01234567', { itemsPerPage: 2, startIndex: 4 })
    ).toMatchObject({
      companyNumber: '01234567',
      totalCount: 7,
      satisfiedCount: 3,
      partSatisfiedCount: 1,
      itemsPerPage: 2,
      startIndex: 4,
      charges: [{ chargeId: 'charge-1' }],
      record
    });
  });
});

describe('insolvency mapping', () => {
  it('maps the official nested case shape without inventing conclusions', () => {
    let record = {
      etag: 'etag-1',
      status: 'future-insolvency-status',
      cases: [
        {
          type: 'future-case-type',
          number: '1',
          dates: [{ type: 'petitioned-on', date: '2024-01-02', future_date_field: true }],
          notes: ['A public register note'],
          practitioners: [
            {
              name: 'Jane Practitioner',
              address: [
                {
                  address_line_1: '1 Example Street',
                  locality: 'London',
                  postal_code: 'SW1A 1AA'
                }
              ],
              appointed_on: '2024-01-03',
              ceased_to_act_on: '2024-06-01',
              role: 'practitioner',
              future_practitioner_field: true
            }
          ],
          links: { charge: '/company/01234567/charges/charge-1' },
          future_case_field: true
        }
      ],
      future_field: true
    };

    let mapped = mapCompanyInsolvency(record, '01234567');
    expect(mapped).toMatchObject({
      companyNumber: '01234567',
      status: 'future-insolvency-status',
      cases: [
        {
          type: 'future-case-type',
          number: '1',
          dates: [{ type: 'petitioned-on', date: '2024-01-02' }],
          notes: ['A public register note'],
          practitioners: [
            {
              name: 'Jane Practitioner',
              addresses: [
                {
                  addressLine1: '1 Example Street',
                  locality: 'London',
                  postalCode: 'SW1A 1AA'
                }
              ],
              appointedOn: '2024-01-03',
              ceasedToActOn: '2024-06-01',
              role: 'practitioner'
            }
          ],
          links: record.cases[0]!.links,
          record: record.cases[0]!
        }
      ],
      record
    });
    expect(mapped).not.toHaveProperty('hasInsolvency');
    expect(mapped).not.toHaveProperty('isInsolvent');
    expect(mapped.cases[0]?.dates[0]?.record).toBe(record.cases[0]!.dates[0]);
    expect(mapped.cases[0]?.practitioners[0]?.record).toBe(record.cases[0]!.practitioners[0]);
  });
});

describe('PSC mapping', () => {
  it('maps individual, corporate, and super-secure variants without inferred identity state', () => {
    let individual = {
      etag: 'etag-1',
      name: 'DOE, Jane',
      kind: 'individual-person-with-significant-control',
      notified_on: '2024-01-02',
      address: { address_line_1: '1 Example Street', locality: 'London' },
      date_of_birth: { month: 2, year: 1980 },
      nationality: 'British',
      country_of_residence: 'England',
      natures_of_control: ['ownership-of-shares-75-to-100-percent'],
      identity_verification_details: {
        anti_money_laundering_supervisory_bodies: ['HMRC'],
        appointment_verification_end_on: '2026-01-01',
        appointment_verification_start_on: '2025-01-01',
        appointment_verification_statement_date: '2024-12-01',
        appointment_verification_statement_due_on: '2025-02-01',
        authorised_corporate_service_provider_name: 'EXAMPLE ACSP LIMITED',
        identity_verified_on: '2024-11-01',
        preferred_name: 'Jane Doe',
        future_identity_field: true
      },
      links: {
        self: '/company/01234567/persons-with-significant-control/individual/notification%2F1'
      },
      future_field: true
    };
    let corporate = {
      etag: 'etag-2',
      name: 'EXAMPLE HOLDINGS LIMITED',
      kind: 'corporate-entity-beneficial-owner',
      notified_on: '2024-01-03',
      address: { address_line_1: '2 Example Street' },
      principal_office_address: { address_line_1: '3 Example Street' },
      identification: {
        legal_authority: 'Companies Act 2006',
        legal_form: 'Private limited company',
        place_registered: 'Companies House',
        registration_number: '01234567',
        country_registered: 'England and Wales',
        future_identification_field: true
      },
      natures_of_control: ['ownership-of-shares-25-to-50-percent'],
      is_sanctioned: false,
      links: {
        self: '/company/01234567/persons-with-significant-control/corporate-entity-beneficial-owner/notification-2'
      }
    };
    let superSecure = {
      etag: 'etag-3',
      kind: 'super-secure-person-with-significant-control',
      description: 'super-secure-persons-with-significant-control',
      ceased: true,
      links: {
        self: '/company/01234567/persons-with-significant-control/super-secure/secure-1'
      }
    };

    let mappedIndividual = mapPscRecord(individual);
    expect(mappedIndividual).toMatchObject({
      notificationId: 'notification/1',
      kind: 'individual-person-with-significant-control',
      name: 'DOE, Jane',
      notifiedOn: '2024-01-02',
      dateOfBirth: { month: 2, year: 1980 },
      nationality: 'British',
      countryOfResidence: 'England',
      address: { addressLine1: '1 Example Street', locality: 'London' },
      identityVerificationDetails: {
        antiMoneyLaunderingSupervisoryBodies: ['HMRC'],
        appointmentVerificationEndOn: '2026-01-01',
        appointmentVerificationStartOn: '2025-01-01',
        appointmentVerificationStatementDate: '2024-12-01',
        appointmentVerificationStatementDueOn: '2025-02-01',
        authorisedCorporateServiceProviderName: 'EXAMPLE ACSP LIMITED',
        identityVerifiedOn: '2024-11-01',
        preferredName: 'Jane Doe',
        record: individual.identity_verification_details
      },
      record: individual
    });
    expect(mappedIndividual).not.toHaveProperty('identityVerified');
    expect(mappedIndividual).not.toHaveProperty('risk');

    expect(mapPscRecord(corporate)).toMatchObject({
      notificationId: 'notification-2',
      kind: 'corporate-entity-beneficial-owner',
      name: 'EXAMPLE HOLDINGS LIMITED',
      isSanctioned: false,
      principalOfficeAddress: { addressLine1: '3 Example Street' },
      identification: {
        legalAuthority: 'Companies Act 2006',
        legalForm: 'Private limited company',
        placeRegistered: 'Companies House',
        registrationNumber: '01234567',
        countryRegistered: 'England and Wales',
        record: corporate.identification
      },
      record: corporate
    });
    expect(mapPscRecord(superSecure)).toEqual({
      notificationId: 'secure-1',
      kind: 'super-secure-person-with-significant-control',
      description: 'super-secure-persons-with-significant-control',
      ceased: true,
      links: superSecure.links,
      record: superSecure
    });
  });

  it('maps PSC and statement counts, pagination, IDs, and link fallbacks', () => {
    let pscRecord = {
      active_count: 1,
      ceased_count: 0,
      items: [],
      items_per_page: 5,
      links: { self: '/company/01234567/persons-with-significant-control' },
      start_index: 10,
      total_results: 11,
      future_field: true
    };
    expect(
      mapPscListEnvelope(pscRecord, '01234567', { itemsPerPage: 20, startIndex: 0 })
    ).toMatchObject({
      companyNumber: '01234567',
      activeCount: 1,
      ceasedCount: 0,
      pscs: [],
      itemsPerPage: 5,
      startIndex: 10,
      totalResults: 11,
      links: pscRecord.links,
      record: pscRecord
    });

    let statement = {
      etag: 'etag-1',
      kind: 'persons-with-significant-control-statement',
      notified_on: '2024-01-02',
      ceased_on: '2024-03-04',
      linked_psc_name: 'DOE, Jane',
      restrictions_notice_withdrawal_reason: 'future-reason',
      statement: 'future-statement',
      links: {
        self: '/company/01234567/persons-with-significant-control-statements/statement%2F1'
      },
      future_field: true
    };
    expect(mapPscStatementRecord(statement)).toEqual({
      statementId: 'statement/1',
      kind: 'persons-with-significant-control-statement',
      statement: 'future-statement',
      notifiedOn: '2024-01-02',
      ceasedOn: '2024-03-04',
      linkedPscName: 'DOE, Jane',
      restrictionsNoticeWithdrawalReason: 'future-reason',
      links: statement.links,
      record: statement
    });

    let statementList = {
      active_count: 2,
      ceased_count: 1,
      items: [statement],
      items_per_page: 20,
      links: { self: '/company/01234567/persons-with-significant-control-statements' },
      start_index: 0,
      total_results: 3
    };
    expect(
      mapPscStatementListEnvelope(statementList, '01234567', {
        itemsPerPage: 20,
        startIndex: 0
      })
    ).toMatchObject({
      companyNumber: '01234567',
      activeCount: 2,
      ceasedCount: 1,
      statements: [{ statementId: 'statement/1', statement: 'future-statement' }],
      itemsPerPage: 20,
      startIndex: 0,
      totalResults: 3,
      record: statementList
    });
  });
});

describe('company record invocations', () => {
  it('passes charge pagination and request IDs through the tools', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'listCompanyCharges').mockResolvedValue({
      companyNumber: '01234567',
      charges: [],
      itemsPerPage: 5,
      startIndex: 10,
      record: {}
    } as never);
    vi.spyOn(CompaniesHouseClient.prototype, 'getCompanyCharge').mockResolvedValue({
      chargeId: 'charge-1',
      chargeNumber: 1,
      status: 'outstanding',
      classification: [],
      record: {}
    } as never);

    let listResult = await listCompanyCharges.handleInvocation(
      context({ companyNumber: '01234567', itemsPerPage: 5, startIndex: 10 })
    );
    let getResult = await getCompanyCharge.handleInvocation(
      context({ companyNumber: '01234567', chargeId: 'charge-1' })
    );

    expect(CompaniesHouseClient.prototype.listCompanyCharges).toHaveBeenCalledWith(
      '01234567',
      { itemsPerPage: 5, startIndex: 10 }
    );
    expect(listCompanyCharges.outputSchema.parse(listResult.output)).toEqual(
      listResult.output
    );
    expect(getResult.output).toMatchObject({
      companyNumber: '01234567',
      chargeId: 'charge-1'
    });
  });

  it('passes documented register-view strings through client parameters', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'listCompanyPscs').mockResolvedValue({
      companyNumber: '01234567',
      activeCount: 0,
      ceasedCount: 0,
      pscs: [],
      itemsPerPage: 20,
      startIndex: 0,
      totalResults: 0,
      record: {}
    } as never);
    vi.spyOn(CompaniesHouseClient.prototype, 'listPscStatements').mockResolvedValue({
      companyNumber: '01234567',
      activeCount: 0,
      ceasedCount: 0,
      statements: [],
      itemsPerPage: 20,
      startIndex: 0,
      totalResults: 0,
      record: {}
    } as never);

    await listCompanyPscs.handleInvocation(
      context({
        companyNumber: '01234567',
        itemsPerPage: 20,
        startIndex: 0,
        registerView: false
      })
    );
    await listPscStatements.handleInvocation(
      context({
        companyNumber: '01234567',
        itemsPerPage: 20,
        startIndex: 0,
        registerView: true
      })
    );

    expect(CompaniesHouseClient.prototype.listCompanyPscs).toHaveBeenCalledWith('01234567', {
      itemsPerPage: 20,
      startIndex: 0,
      registerView: false
    });
    expect(CompaniesHouseClient.prototype.listPscStatements).toHaveBeenCalledWith('01234567', {
      itemsPerPage: 20,
      startIndex: 0,
      registerView: true
    });
  });
});
