import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';
import { CompaniesHouseClient } from '../lib/client';
import {
  mapCompanyOfficerListEnvelope,
  mapCompanyOfficerRecord,
  mapDisqualifiedOfficerRecord,
  mapDisqualifiedOfficerSearchRecord,
  mapOfficerAppointmentListEnvelope,
  mapOfficerAppointmentRecord,
  mapOfficerSearchRecord
} from '../lib/mappers';
import { getOfficerDisqualifications, searchDisqualifiedOfficers } from './disqualifications';
import { listCompanyOfficers, listOfficerAppointments, searchOfficers } from './officers';

let context = <T>(input: T) => ({ input, auth: { token: 'secret-key' }, config: {} }) as never;

afterEach(() => {
  vi.restoreAllMocks();
});

describeMcpCompatibleToolSchemas(
  'Companies House officer and disqualification tool input schemas',
  provider.actions
);

describe('officer and disqualification tool contracts', () => {
  it('uses the exact keys and safe read-only tags without identity or risk claims', () => {
    let tools = [
      [searchOfficers, 'search_officers'],
      [listCompanyOfficers, 'list_company_officers'],
      [listOfficerAppointments, 'list_officer_appointments'],
      [searchDisqualifiedOfficers, 'search_disqualified_officers'],
      [getOfficerDisqualifications, 'get_officer_disqualifications']
    ] as const;

    for (let [tool, key] of tools) {
      expect(tool.key).toBe(key);
      expect(tool.tags).toEqual({ readOnly: true, destructive: false });
      expect(tool.description).not.toMatch(/identity|verify|verification|risk score/i);
    }
  });

  it('applies the common pagination defaults and bounds', () => {
    for (let schema of [searchOfficers.inputSchema, searchDisqualifiedOfficers.inputSchema]) {
      expect(schema.parse({ query: '  Jane Doe  ' })).toMatchObject({
        query: 'Jane Doe',
        itemsPerPage: 20,
        startIndex: 0
      });
      expect(schema.safeParse({ query: 'Jane', itemsPerPage: 0 }).success).toBe(false);
      expect(schema.safeParse({ query: 'Jane', itemsPerPage: 101 }).success).toBe(false);
      expect(schema.safeParse({ query: 'Jane', startIndex: -1 }).success).toBe(false);
    }
  });

  it('requires registerView true when registerType is supplied', () => {
    expect(
      listCompanyOfficers.inputSchema.safeParse({
        companyNumber: '01234567',
        registerType: 'directors'
      }).success
    ).toBe(false);
    expect(
      listCompanyOfficers.inputSchema.safeParse({
        companyNumber: '01234567',
        registerView: false,
        registerType: 'secretaries'
      }).success
    ).toBe(false);
    expect(
      listCompanyOfficers.inputSchema.safeParse({
        companyNumber: '01234567',
        registerView: true,
        registerType: 'llp_members',
        orderBy: 'surname'
      }).success
    ).toBe(true);
  });

  it('uses a top-level allowlisted object for disqualification routes', () => {
    expect(
      getOfficerDisqualifications.inputSchema.parse({
        officerType: 'natural',
        officerId: ' natural/1 '
      })
    ).toEqual({ officerType: 'natural', officerId: 'natural/1' });
    for (let officerType of ['unknown', 'toString', 'constructor', '__proto__']) {
      expect(
        getOfficerDisqualifications.inputSchema.safeParse({
          officerType,
          officerId: 'officer-1'
        }).success
      ).toBe(false);
    }
  });
});

describe('officer record mapping', () => {
  it('maps public DOBs, officer IDs, links, and records for officer search', () => {
    let record = {
      title: 'DOE, Jane',
      appointment_count: 3,
      date_of_birth: '1980-02-03',
      address_snippet: '1 Example Street, London',
      links: { self: '/officers/officer%2F1/appointments' },
      future: true
    };

    expect(mapOfficerSearchRecord(record)).toEqual({
      officerId: 'officer/1',
      name: 'DOE, Jane',
      appointmentCount: 3,
      dateOfBirth: '1980-02-03',
      addressSnippet: '1 Example Street, London',
      appointmentsUrl: '/officers/officer%2F1/appointments',
      record
    });
  });

  it('maps company officer and appointment records with open provider values', () => {
    let officerRecord = {
      name: 'DOE, Jane',
      officer_role: 'future-role',
      appointed_on: '2020-01-02',
      resigned_on: '2024-03-04',
      nationality: 'British',
      occupation: 'Engineer',
      country_of_residence: 'England',
      date_of_birth: { month: 2, year: 1980 },
      address: { locality: 'London' },
      links: {
        officer: { appointments: '/officers/officer-1/appointments' },
        self: '/company/01234567/appointments/appointment-1'
      }
    };
    expect(mapCompanyOfficerRecord(officerRecord)).toEqual({
      officerId: 'officer-1',
      name: 'DOE, Jane',
      role: 'future-role',
      appointedOn: '2020-01-02',
      resignedOn: '2024-03-04',
      nationality: 'British',
      occupation: 'Engineer',
      countryOfResidence: 'England',
      dateOfBirth: { month: 2, year: 1980 },
      address: { locality: 'London', record: officerRecord.address },
      links: officerRecord.links,
      record: officerRecord
    });

    let appointmentRecord = {
      appointed_to: {
        company_number: '01234567',
        company_name: 'EXAMPLE LIMITED',
        company_status: 'future-status'
      },
      officer_role: 'future-role',
      appointed_on: '2020-01-02',
      resigned_on: '2024-03-04',
      links: { company: '/company/01234567' }
    };
    expect(mapOfficerAppointmentRecord(appointmentRecord)).toEqual({
      companyNumber: '01234567',
      companyName: 'EXAMPLE LIMITED',
      companyStatus: 'future-status',
      role: 'future-role',
      appointedOn: '2020-01-02',
      resignedOn: '2024-03-04',
      links: appointmentRecord.links,
      record: appointmentRecord
    });

    let incompleteHistoricalAppointment = {
      appointed_to: { company_number: '00000001' },
      links: { company: '/company/00000001' }
    };
    expect(mapOfficerAppointmentRecord(incompleteHistoricalAppointment)).toEqual({
      companyNumber: '00000001',
      links: incompleteHistoricalAppointment.links,
      record: incompleteHistoricalAppointment
    });
  });

  it('maps company and officer envelope metadata without conflating pagination', () => {
    expect(
      mapCompanyOfficerListEnvelope(
        {
          active_count: 2,
          resigned_count: 3,
          items_per_page: 7,
          start_index: 14,
          total_results: 6,
          items: []
        },
        '01234567',
        { itemsPerPage: 20, startIndex: 0 }
      )
    ).toMatchObject({
      companyNumber: '01234567',
      activeCount: 2,
      resignedCount: 3,
      officers: [],
      itemsPerPage: 7,
      startIndex: 14,
      totalResults: 6
    });

    expect(
      mapOfficerAppointmentListEnvelope(
        {
          name: 'DOE, Jane',
          date_of_birth: { month: 2, year: 1980 },
          items: [],
          total_results: 4
        },
        'officer-1',
        { itemsPerPage: 5, startIndex: 10 }
      )
    ).toMatchObject({
      officerId: 'officer-1',
      name: 'DOE, Jane',
      dateOfBirth: { month: 2, year: 1980 },
      appointments: [],
      itemsPerPage: 5,
      startIndex: 10,
      totalResults: 4
    });
  });

  it('preserves links and records when an officer ID cannot be parsed', () => {
    let searchRecord = {
      title: 'DOE, Jane',
      links: { self: '/officers/officer-1/not-appointments' }
    };
    let companyRecord = {
      name: 'DOE, Jane',
      officer_role: 'director',
      links: { officer: { appointments: 'https://example.com/officer-1' } }
    };
    expect(mapOfficerSearchRecord(searchRecord)).toEqual({
      name: 'DOE, Jane',
      appointmentsUrl: '/officers/officer-1/not-appointments',
      record: searchRecord
    });
    expect(mapCompanyOfficerRecord(companyRecord)).toEqual({
      name: 'DOE, Jane',
      role: 'director',
      links: companyRecord.links,
      record: companyRecord
    });
  });
});

describe('disqualification record mapping', () => {
  it('maps natural and corporate search routes and preserves unparseable links', () => {
    let natural = {
      title: 'DOE, Jane',
      address_snippet: '1 Example Street, London',
      links: { self: '/disqualified-officers/natural/natural-1' }
    };
    let corporate = {
      title: 'EXAMPLE LIMITED',
      links: { self: '/disqualified-officers/corporate/corporate-1' }
    };
    let changed = {
      title: 'UNKNOWN',
      links: { self: '/disqualified-officers/partnership/partner-1' }
    };
    expect(mapDisqualifiedOfficerSearchRecord(natural)).toEqual({
      officerId: 'natural-1',
      officerType: 'natural',
      name: 'DOE, Jane',
      addressSnippet: '1 Example Street, London',
      disqualificationsUrl: natural.links.self,
      record: natural
    });
    expect(mapDisqualifiedOfficerSearchRecord(corporate)).toMatchObject({
      officerId: 'corporate-1',
      officerType: 'corporate',
      name: 'EXAMPLE LIMITED'
    });
    expect(mapDisqualifiedOfficerSearchRecord(changed)).toEqual({
      name: 'UNKNOWN',
      disqualificationsUrl: changed.links.self,
      record: changed
    });
  });

  it('maps official natural disqualification details to stable fields', () => {
    let record = {
      forename: 'Jane',
      other_forenames: 'Alice',
      surname: 'Doe',
      title: 'Dr',
      honours: 'OBE',
      person_number: '1234567890',
      date_of_birth: { month: 2, year: 1980 },
      nationality: 'British',
      disqualifications: [
        {
          address: { locality: 'London' },
          case_identifier: 'CASE-1',
          company_names: ['EXAMPLE LIMITED'],
          court_name: 'High Court',
          disqualification_type: 'court-order',
          disqualified_from: '2020-01-02',
          disqualified_until: '2026-01-02',
          heard_on: '2019-12-01',
          undertaken_on: '2019-12-02',
          last_variation: [
            {
              case_identifier: 'VAR-1',
              court_name: 'High Court',
              varied_on: '2021-01-01'
            }
          ],
          reason: {
            act: 'company-directors-disqualification-act-1986',
            article: '4',
            description_identifier: 'misconduct',
            section: '6'
          }
        }
      ],
      permissions_to_act: [
        {
          company_names: ['PERMITTED LIMITED'],
          court_name: 'High Court',
          expires_on: '2025-01-01',
          granted_on: '2024-01-01'
        }
      ],
      links: { self: '/disqualified-officers/natural/natural-1' }
    };
    expect(mapDisqualifiedOfficerRecord(record, 'natural', 'natural-1')).toEqual({
      officerId: 'natural-1',
      officerType: 'natural',
      name: 'Jane Alice Doe',
      personNumber: '1234567890',
      forename: 'Jane',
      otherForenames: 'Alice',
      surname: 'Doe',
      title: 'Dr',
      honours: 'OBE',
      dateOfBirth: { month: 2, year: 1980 },
      nationality: 'British',
      disqualifications: [
        {
          address: { locality: 'London', record: record.disqualifications[0]!.address },
          caseIdentifier: 'CASE-1',
          companyNames: ['EXAMPLE LIMITED'],
          courtName: 'High Court',
          disqualificationType: 'court-order',
          disqualifiedFrom: '2020-01-02',
          disqualifiedUntil: '2026-01-02',
          heardOn: '2019-12-01',
          undertakenOn: '2019-12-02',
          lastVariations: [
            {
              caseIdentifier: 'VAR-1',
              courtName: 'High Court',
              variedOn: '2021-01-01',
              record: record.disqualifications[0]!.last_variation[0]!
            }
          ],
          reason: {
            act: 'company-directors-disqualification-act-1986',
            article: '4',
            descriptionIdentifier: 'misconduct',
            section: '6',
            record: record.disqualifications[0]!.reason
          },
          record: record.disqualifications[0]
        }
      ],
      permissionsToAct: [
        {
          companyNames: ['PERMITTED LIMITED'],
          courtName: 'High Court',
          expiresOn: '2025-01-01',
          grantedOn: '2024-01-01',
          record: record.permissions_to_act[0]
        }
      ],
      links: record.links,
      record
    });
  });

  it('maps official corporate-only disqualification details', () => {
    let record = {
      name: 'EXAMPLE HOLDINGS LIMITED',
      company_number: '01234567',
      country_of_registration: 'United Kingdom',
      person_number: '9988776655',
      disqualifications: [],
      permissions_to_act: [],
      links: { self: '/disqualified-officers/corporate/corporate-1' }
    };

    expect(mapDisqualifiedOfficerRecord(record, 'corporate', 'corporate-1')).toEqual({
      officerId: 'corporate-1',
      officerType: 'corporate',
      name: 'EXAMPLE HOLDINGS LIMITED',
      personNumber: '9988776655',
      companyNumber: '01234567',
      countryOfRegistration: 'United Kingdom',
      disqualifications: [],
      permissionsToAct: [],
      links: record.links,
      record
    });
  });
});

describe('officer and disqualification invocations', () => {
  it('passes provider query controls through list_company_officers', async () => {
    vi.spyOn(CompaniesHouseClient.prototype, 'listCompanyOfficers').mockResolvedValue({
      companyNumber: '01234567',
      activeCount: 1,
      resignedCount: 2,
      officers: [],
      itemsPerPage: 5,
      startIndex: 10,
      totalResults: 3,
      record: {}
    } as never);

    let result = await listCompanyOfficers.handleInvocation(
      context({
        companyNumber: '01234567',
        itemsPerPage: 5,
        startIndex: 10,
        orderBy: 'appointed_on',
        registerView: true,
        registerType: 'directors'
      })
    );

    expect(CompaniesHouseClient.prototype.listCompanyOfficers).toHaveBeenCalledWith(
      '01234567',
      {
        itemsPerPage: 5,
        startIndex: 10,
        orderBy: 'appointed_on',
        registerView: true,
        registerType: 'directors'
      }
    );
    expect(listCompanyOfficers.outputSchema.parse(result.output)).toEqual(result.output);
  });

  it('returns appointment owner details and public DOB', async () => {
    let output = {
      officerId: 'officer-1',
      name: 'DOE, Jane',
      dateOfBirth: { month: 2, year: 1980 },
      appointments: [],
      itemsPerPage: 20,
      startIndex: 0,
      totalResults: 0,
      record: {}
    };
    vi.spyOn(CompaniesHouseClient.prototype, 'listOfficerAppointments').mockResolvedValue(
      output as never
    );

    let result = await listOfficerAppointments.handleInvocation(
      context({ officerId: 'officer-1', itemsPerPage: 20, startIndex: 0 })
    );

    expect(CompaniesHouseClient.prototype.listOfficerAppointments).toHaveBeenCalledWith(
      'officer-1',
      { itemsPerPage: 20, startIndex: 0 }
    );
    expect(listOfficerAppointments.outputSchema.parse(result.output)).toEqual(output);
  });

  it.each([
    'natural',
    'corporate'
  ] as const)('routes %s disqualification records through the allowlisted client method', async officerType => {
    let output = {
      officerId: 'officer/1',
      officerType,
      name: 'Example',
      disqualifications: [],
      permissionsToAct: [],
      links: { self: `/disqualified-officers/${officerType}/officer%2F1` },
      record: {}
    };
    vi.spyOn(CompaniesHouseClient.prototype, 'getOfficerDisqualifications').mockResolvedValue(
      output as never
    );

    let result = await getOfficerDisqualifications.handleInvocation(
      context({ officerType, officerId: 'officer/1' })
    );

    expect(CompaniesHouseClient.prototype.getOfficerDisqualifications).toHaveBeenCalledWith(
      'officer/1',
      officerType
    );
    expect(getOfficerDisqualifications.outputSchema.parse(result.output)).toEqual(output);
  });
});
