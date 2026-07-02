import { describe, expect, it } from 'vitest';
import { buildBusinessPartnerFilters, expandFor, mapAddress } from './business-partners';

describe('SAP S/4HANA business partners tool helpers', () => {
  it('uses nested address communication expansions for get_business_partner details', () => {
    expect(expandFor('addresses')).toEqual([
      'to_BusinessPartnerAddress',
      'to_Customer',
      'to_Supplier'
    ]);

    expect(expandFor('addresses', { includeAddressCommunication: true })).toEqual([
      'to_BusinessPartnerAddress',
      'to_BusinessPartnerAddress/to_EmailAddress',
      'to_BusinessPartnerAddress/to_PhoneNumber',
      'to_BusinessPartnerAddress/to_MobilePhoneNumber',
      'to_Customer',
      'to_Supplier'
    ]);
  });

  it('maps documented nested address communication records', () => {
    expect(
      mapAddress({
        AddressID: '28238',
        Country: 'US',
        CityName: 'Newtown Square',
        to_EmailAddress: {
          results: [
            {
              EmailAddress: 'business.partner@example.com'
            }
          ]
        },
        to_PhoneNumber: {
          results: [
            {
              PhoneNumber: '+1 610 555 0100'
            }
          ]
        }
      })
    ).toMatchObject({
      addressId: '28238',
      country: 'US',
      cityName: 'Newtown Square',
      emailAddress: 'business.partner@example.com',
      phoneNumber: '+1 610 555 0100'
    });
  });

  it('uses documented business partner fields for list filters', () => {
    expect(
      buildBusinessPartnerFilters({
        businessPartner: '1000000',
        search: 'Acme',
        createdSince: '2026-01-02T03:04:05.678Z',
        updatedSince: '2026-02-03T04:05:06.789Z',
        customer: true,
        supplier: true
      })
    ).toBe(
      "BusinessPartner eq '1000000' and (substringof('Acme', BusinessPartner) or substringof('Acme', BusinessPartnerFullName) or substringof('Acme', OrganizationBPName1) or substringof('Acme', FirstName) or substringof('Acme', LastName)) and CreationDate ge datetime'2026-01-02T03:04:05' and LastChangeDate ge datetime'2026-02-03T04:05:06' and Customer ne '' and Supplier ne ''"
    );
  });
});
