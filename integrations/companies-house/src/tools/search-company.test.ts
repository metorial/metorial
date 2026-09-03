import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';
import { CompaniesHouseClient } from '../lib/client';
import { mapCompanySearchRecord } from '../lib/mappers';
import { getCompanyProfile } from './company-profile';
import { searchCompanies, searchCompaniesAdvanced } from './search-companies';

let context = <T>(input: T) => ({ input, auth: { token: 'secret-key' }, config: {} }) as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describeMcpCompatibleToolSchemas(
  'Companies House company discovery tool input schemas',
  provider.actions
);

describe('search_companies', () => {
  it('has the exact key and safe read-only tags', () => {
    expect(searchCompanies.key).toBe('search_companies');
    expect(searchCompanies.tags).toEqual({ readOnly: true, destructive: false });
    expect(searchCompanies.description).toContain('name or company number');
    expect(searchCompanies.description).toContain('company-name availability');
  });

  it('trims the query and applies bounded pagination defaults', () => {
    expect(searchCompanies.inputSchema.parse({ query: '  Example  ' })).toEqual({
      query: 'Example',
      itemsPerPage: 20,
      startIndex: 0
    });
    expect(
      searchCompanies.inputSchema.safeParse({ query: 'Example', itemsPerPage: 0 }).success
    ).toBe(false);
    expect(
      searchCompanies.inputSchema.safeParse({ query: 'Example', itemsPerPage: 101 }).success
    ).toBe(false);
    expect(
      searchCompanies.inputSchema.safeParse({ query: 'Example', startIndex: -1 }).success
    ).toBe(false);
    expect(searchCompanies.inputSchema.safeParse({ query: '   ' }).success).toBe(false);
  });

  it('allows only a unique nonempty restrictions list', () => {
    expect(
      searchCompanies.inputSchema.safeParse({
        query: 'Example',
        restrictions: ['active-companies', 'legally-equivalent-company-name']
      }).success
    ).toBe(true);
    expect(
      searchCompanies.inputSchema.safeParse({ query: 'Example', restrictions: [] }).success
    ).toBe(false);
    expect(
      searchCompanies.inputSchema.safeParse({
        query: 'Example',
        restrictions: ['active-companies', 'active-companies']
      }).success
    ).toBe(false);
    expect(
      searchCompanies.inputSchema.safeParse({
        query: 'Example',
        restrictions: ['dissolved-companies']
      }).success
    ).toBe(false);
  });

  it('returns stable company results while preserving records and open enum values', async () => {
    let record = {
      company_number: '01234567',
      title: 'EXAMPLE LIMITED',
      company_status: 'future-status',
      company_type: 'future-type',
      date_of_creation: '2020-01-02',
      date_of_cessation: '2025-03-04',
      address_snippet: '1 Example Street, London',
      links: { company_profile: '/company/01234567' },
      future: true
    };
    vi.spyOn(CompaniesHouseClient.prototype, 'searchCompanies').mockResolvedValue({
      items: [
        {
          companyNumber: '01234567',
          name: 'EXAMPLE LIMITED',
          status: 'future-status',
          type: 'future-type',
          incorporatedOn: '2020-01-02',
          dissolvedOn: '2025-03-04',
          addressSnippet: '1 Example Street, London',
          profileUrl: '/company/01234567',
          record
        }
      ],
      itemsPerPage: 10,
      startIndex: 30,
      totalResults: 41,
      record: { items: [record], total_results: 41 }
    } as never);

    let result = await searchCompanies.handleInvocation(
      context({
        query: 'Example',
        restrictions: ['active-companies', 'legally-equivalent-company-name'],
        itemsPerPage: 10,
        startIndex: 30
      })
    );

    expect(CompaniesHouseClient.prototype.searchCompanies).toHaveBeenCalledWith({
      query: 'Example',
      restrictions: ['active-companies', 'legally-equivalent-company-name'],
      itemsPerPage: 10,
      startIndex: 30
    });
    expect(searchCompanies.outputSchema.parse(result.output)).toEqual(result.output);
    expect(result.output).toEqual({
      items: [
        {
          companyNumber: '01234567',
          name: 'EXAMPLE LIMITED',
          status: 'future-status',
          type: 'future-type',
          incorporatedOn: '2020-01-02',
          dissolvedOn: '2025-03-04',
          addressSnippet: '1 Example Street, London',
          profileUrl: '/company/01234567',
          record
        }
      ],
      itemsPerPage: 10,
      startIndex: 30,
      totalResults: 41,
      record: { items: [record], total_results: 41 }
    });
  });

  it('uses the official simple-search self link as the profile URL', () => {
    expect(
      mapCompanySearchRecord({
        company_number: '01234567',
        title: 'EXAMPLE LIMITED',
        links: { self: '/company/01234567' }
      })
    ).toMatchObject({ profileUrl: '/company/01234567' });
  });
});

describe('search_companies_advanced', () => {
  it('has the exact key and safe read-only tags', () => {
    expect(searchCompaniesAdvanced.key).toBe('search_companies_advanced');
    expect(searchCompaniesAdvanced.tags).toEqual({ readOnly: true, destructive: false });
  });

  it('requires a business filter and rejects empty arrays', () => {
    expect(searchCompaniesAdvanced.inputSchema.safeParse({}).success).toBe(false);
    expect(searchCompaniesAdvanced.inputSchema.safeParse({ itemsPerPage: 10 }).success).toBe(
      false
    );
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({
        nameIncludes: 'Example',
        companyStatuses: []
      }).success
    ).toBe(false);
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({ companyStatuses: ['future-status'] })
        .success
    ).toBe(true);
  });

  it('validates both calendar-date ranges', () => {
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({ incorporatedFrom: '2024-02-30' }).success
    ).toBe(false);
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({
        incorporatedFrom: '2024-02-02',
        incorporatedTo: '2024-02-01'
      }).success
    ).toBe(false);
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({
        dissolvedFrom: '2024-02-02',
        dissolvedTo: '2024-02-01'
      }).success
    ).toBe(false);
    expect(
      searchCompaniesAdvanced.inputSchema.safeParse({
        incorporatedFrom: '2024-02-01',
        incorporatedTo: '2024-02-02',
        dissolvedFrom: '2025-02-01',
        dissolvedTo: '2025-02-02'
      }).success
    ).toBe(true);
  });

  it('maps public names to the client contract and preserves requested pagination', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'searchCompaniesAdvanced').mockResolvedValue({
      items: [],
      itemsPerPage: 7,
      startIndex: 14,
      totalResults: 42,
      record: { hits: '42', items: [] }
    });

    let parsed = searchCompaniesAdvanced.inputSchema.parse({
      nameIncludes: '  Example  ',
      nameExcludes: 'Dormant',
      companyStatuses: ['active', 'dissolved'],
      companyTypes: ['ltd', 'plc'],
      companySubtypes: ['community-interest-company'],
      incorporatedFrom: '2020-01-01',
      incorporatedTo: '2024-01-01',
      dissolvedFrom: '2024-02-01',
      dissolvedTo: '2024-03-01',
      location: 'London',
      sicCodes: ['62012', '62020'],
      itemsPerPage: 7,
      startIndex: 14
    });
    let result = await searchCompaniesAdvanced.handleInvocation(context(parsed));

    expect(CompaniesHouseClient.prototype.searchCompaniesAdvanced).toHaveBeenCalledWith({
      companyNameIncludes: 'Example',
      companyNameExcludes: 'Dormant',
      companyStatus: ['active', 'dissolved'],
      companyType: ['ltd', 'plc'],
      companySubtype: ['community-interest-company'],
      incorporatedFrom: '2020-01-01',
      incorporatedTo: '2024-01-01',
      dissolvedFrom: '2024-02-01',
      dissolvedTo: '2024-03-01',
      location: 'London',
      sicCodes: ['62012', '62020'],
      itemsPerPage: 7,
      startIndex: 14
    });
    expect(result.output).toMatchObject({
      items: [],
      itemsPerPage: 7,
      startIndex: 14,
      totalResults: 42
    });
  });

  it('prefers the advanced-search company_profile link', () => {
    expect(
      mapCompanySearchRecord({
        company_number: '01234567',
        company_name: 'EXAMPLE LIMITED',
        links: {
          company_profile: '/advanced/company/01234567',
          self: '/simple/company/01234567'
        }
      })
    ).toMatchObject({ profileUrl: '/advanced/company/01234567' });
  });
});

describe('get_company_profile', () => {
  it('has the exact key and safe read-only tags', () => {
    expect(getCompanyProfile.key).toBe('get_company_profile');
    expect(getCompanyProfile.tags).toEqual({ readOnly: true, destructive: false });
  });

  it('returns the useful profile surface with its original record', async () => {
    let record = {
      company_number: '01234567',
      company_name: 'EXAMPLE LIMITED',
      company_status: 'future-status',
      company_type: 'future-type',
      future: true
    };
    let profile = {
      companyNumber: '01234567',
      name: 'EXAMPLE LIMITED',
      status: 'future-status',
      statusDetail: 'Active proposal to strike off',
      type: 'future-type',
      subtype: 'future-subtype',
      jurisdiction: 'england-wales',
      incorporatedOn: '2020-01-02',
      dissolvedOn: '2025-03-04',
      sicCodes: ['62012'],
      registeredOfficeAddress: {
        addressLine1: '1 Example Street',
        postalCode: 'SW1A 1AA',
        record: { address_line_1: '1 Example Street', postal_code: 'SW1A 1AA' }
      },
      accounts: {
        nextDueOn: '2025-09-30',
        overdue: false,
        record: { next_due: '2025-09-30', overdue: false }
      },
      confirmationStatement: {
        nextDueOn: '2025-08-20',
        overdue: false,
        record: { next_due: '2025-08-20', overdue: false }
      },
      previousNames: [
        {
          name: 'OLD EXAMPLE LIMITED',
          effectiveFrom: '2019-01-01',
          ceasedOn: '2020-01-02',
          record: {
            name: 'OLD EXAMPLE LIMITED',
            effective_from: '2019-01-01',
            ceased_on: '2020-01-02'
          }
        }
      ],
      links: { self: '/company/01234567' },
      record
    };
    vi.spyOn(CompaniesHouseClient.prototype, 'getCompanyProfile').mockResolvedValue(
      profile as never
    );

    let result = await getCompanyProfile.handleInvocation(
      context({ companyNumber: '01234567' })
    );

    expect(CompaniesHouseClient.prototype.getCompanyProfile).toHaveBeenCalledWith('01234567');
    expect(getCompanyProfile.outputSchema.parse(result.output)).toEqual(profile);
    expect(result.output.record).toBe(record);
  });
});
