import { describe, expect, it } from 'vitest';
import { dataverseContinuation, inferBindingType, inferDataverseRecordId } from './client';

describe('Dynamics 365 Dataverse adapter helpers', () => {
  it('extracts stable record IDs from Dataverse records', () => {
    expect(
      inferDataverseRecordId({
        '@odata.id':
          'https://org.crm.dynamics.com/api/data/v9.2/accounts(00000000-0000-0000-0000-000000000001)'
      })
    ).toBe('00000000-0000-0000-0000-000000000001');

    expect(
      inferDataverseRecordId({
        accountid: '00000000-0000-0000-0000-000000000002',
        name: 'Contoso'
      })
    ).toBe('00000000-0000-0000-0000-000000000002');
  });

  it('infers Dataverse operation binding variants from explicit operation inputs', () => {
    expect(inferBindingType({})).toBe('unbound');
    expect(inferBindingType({ entitySetName: 'accounts' })).toBe('collection');
    expect(inferBindingType({ entitySetName: 'accounts', recordId: 'record-id' })).toBe(
      'entity'
    );
    expect(inferBindingType({ bindingType: 'unbound', recordId: 'record-id' })).toBe(
      'unbound'
    );
  });

  it('preserves continuation fields for downstream pagination', () => {
    expect(
      dataverseContinuation({
        nextLink: 'https://org.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=abc',
        count: 12,
        pagesRead: 1,
        complete: false
      })
    ).toEqual({
      nextLink: 'https://org.crm.dynamics.com/api/data/v9.2/accounts?$skiptoken=abc',
      count: 12,
      pagesRead: 1,
      complete: false
    });
  });
});
