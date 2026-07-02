import { afterEach, describe, expect, it, vi } from 'vitest';

let post = vi.fn();

let loadClient = async () => {
  vi.resetModules();
  post.mockReset();

  vi.doMock('slates', async () => {
    let actual = await vi.importActual<typeof import('slates')>('slates');

    return {
      ...actual,
      createAxios: vi.fn(() => ({
        post
      }))
    };
  });

  let { DynamicsClient } = await import('./client');
  return new DynamicsClient({
    token: 'token',
    instanceUrl: 'https://example.crm.dynamics.com/'
  });
};

afterEach(() => {
  vi.doUnmock('slates');
  vi.resetModules();
});

describe('dynamics-365 action request contract', () => {
  it('posts unbound actions to the Dataverse action endpoint with the body as named parameters', async () => {
    let client = await loadClient();
    post.mockResolvedValueOnce({ data: { ok: true } });

    let body = {
      Target: {
        '@odata.type': 'Microsoft.Dynamics.CRM.account',
        accountid: 'cc1e2c4a-e577-ec11-8d21-000d3a554dcd'
      },
      PerformParentingChecks: false
    };

    let result = await client.invokeUnboundAction('Merge', body);

    expect(post).toHaveBeenCalledWith('/Merge', body);
    expect(result).toEqual({ ok: true });
  });

  it('posts bound actions to the entity path with the Microsoft.Dynamics.CRM namespace', async () => {
    let client = await loadClient();
    post.mockResolvedValueOnce({ data: { annotationid: 'note-123' } });

    let body = {
      NoteTitle: 'New Note Title',
      NoteText: 'This is the text of the note'
    };

    let result = await client.invokeBoundAction(
      'contacts',
      '94d8c461-a27a-e511-80d2-00155d2a68d2',
      'new_AddNoteToContact',
      body
    );

    expect(post).toHaveBeenCalledWith(
      '/contacts(94d8c461-a27a-e511-80d2-00155d2a68d2)/Microsoft.Dynamics.CRM.new_AddNoteToContact',
      body
    );
    expect(result).toEqual({ annotationid: 'note-123' });
  });
});

describe('dynamics-365 search request contract', () => {
  it('posts Dataverse search entities as the JSON string expected by the search API', async () => {
    let client = await loadClient();
    post.mockResolvedValueOnce({
      data: {
        Value: [],
        Count: 0
      }
    });

    await client.search('contoso', {
      entities: ['account', 'contact'],
      filter: 'createdon gt 2024-01-01T00:00:00Z',
      top: 10
    });

    expect(post).toHaveBeenCalledWith(
      'https://example.crm.dynamics.com/api/search/v2.0/query',
      {
        search: 'contoso',
        count: true,
        entities: JSON.stringify([{ name: 'account' }, { name: 'contact' }]),
        filter: 'createdon gt 2024-01-01T00:00:00Z',
        top: 10
      },
      {
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json'
        }
      }
    );
  });

  it('parses escaped JSON string search responses from Dataverse', async () => {
    let client = await loadClient();
    post.mockResolvedValueOnce({
      data: JSON.stringify({
        Value: [
          {
            Id: 'record-1',
            EntityName: 'account',
            Score: 1.23,
            Highlights: {},
            Attributes: { name: 'Contoso' }
          }
        ],
        Count: 1
      })
    });

    let result = await client.search('contoso');

    expect(result).toEqual({
      Value: [
        {
          Id: 'record-1',
          EntityName: 'account',
          Score: 1.23,
          Highlights: {},
          Attributes: { name: 'Contoso' }
        }
      ],
      Count: 1
    });
  });
});
