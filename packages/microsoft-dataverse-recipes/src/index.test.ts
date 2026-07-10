import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  batchInputSchema,
  buildCommitFileBlocksUploadBody,
  buildDataverseAssociateRequest,
  buildDataverseBatchRequest,
  buildDataverseDisassociateRequest,
  buildDataverseFileAttachmentData,
  buildDataverseFileColumnValueUrl,
  buildDataverseODataQuery,
  buildDataverseOperationRequest,
  buildDataverseRecordPath,
  buildInitializeFileBlocksUploadBody,
  createDataverseClientFromContext,
  createRecordInputSchema,
  DataverseClient,
  type DataverseHttpClient,
  type DataverseHttpResponse,
  dataverseApiError,
  dataverseSearchInputSchema,
  deleteRecordInputSchema,
  fetchXmlInputSchema,
  fileColumnDownloadInputSchema,
  fileColumnUploadInputSchema,
  formatDataverseRecordKey,
  getRecordInputSchema,
  invokeOperationInputSchema,
  listRecordsInputSchema,
  metadataInputSchema,
  normalizeDataverseInstanceUrl,
  normalizeDataversePagination,
  paginateRecordsInputSchema,
  parseDataverseAttributeMetadata,
  parseDataverseEntityMetadata,
  relationshipInputSchema,
  updateRecordInputSchema
} from './index';

let schemas = [
  createRecordInputSchema,
  getRecordInputSchema,
  updateRecordInputSchema,
  deleteRecordInputSchema,
  listRecordsInputSchema,
  paginateRecordsInputSchema,
  fetchXmlInputSchema,
  dataverseSearchInputSchema,
  metadataInputSchema,
  relationshipInputSchema,
  invokeOperationInputSchema,
  fileColumnDownloadInputSchema,
  fileColumnUploadInputSchema,
  batchInputSchema
];

describe('microsoft dataverse recipe schemas', () => {
  it('uses MCP-compatible top-level object input schemas', () => {
    for (let schema of schemas) {
      let jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema).not.toHaveProperty('oneOf');
      expect(jsonSchema).not.toHaveProperty('anyOf');
      expect(jsonSchema).not.toHaveProperty('allOf');
    }
  });
});

describe('microsoft dataverse URL and OData helpers', () => {
  it('normalizes instance URLs and creates clients from Slates auth/config shape', () => {
    expect(normalizeDataverseInstanceUrl('https://org.crm.dynamics.com/api/data/v9.2/')).toBe(
      'https://org.crm.dynamics.com'
    );

    let client = createDataverseClientFromContext({
      auth: { token: 'token' },
      config: { instanceUrl: 'https://org.crm.dynamics.com/', apiVersion: 'v9.1' }
    });

    expect(client.instanceUrl).toBe('https://org.crm.dynamics.com');
    expect(client.apiBaseUrl).toBe('https://org.crm.dynamics.com/api/data/v9.1');
  });

  it('constructs GUID and alternate-key record paths with safe string encoding', () => {
    expect(
      buildDataverseRecordPath('accounts', '{00000000-0000-0000-0000-000000000001}')
    ).toBe('accounts(00000000-0000-0000-0000-000000000001)');
    expect(
      buildDataverseRecordPath('contacts', {
        emailaddress1: "ada+crm/o'neill@example.com"
      })
    ).toBe("contacts(emailaddress1='ada%2Bcrm%2Fo''neill%40example.com')");
    expect(formatDataverseRecordKey({ accountnumber: 'A 100', statecode: 0 })).toBe(
      "accountnumber='A%20100',statecode=0"
    );
  });

  it('can send If-Match on record updates to prevent accidental upserts', async () => {
    let patch = vi.fn(
      async <T = unknown>(): Promise<DataverseHttpResponse<T>> => ({
        data: { accountid: '00000000-0000-0000-0000-000000000001' } as T
      })
    );
    let client = new DataverseClient({
      token: 'token',
      instanceUrl: 'https://org.crm.dynamics.com',
      http: {
        get: vi.fn(),
        post: vi.fn(),
        patch: patch as unknown as DataverseHttpClient['patch'],
        put: vi.fn(),
        delete: vi.fn()
      }
    });

    await client.updateRecord(
      'accounts',
      '00000000-0000-0000-0000-000000000001',
      { name: 'Contoso' },
      { preventCreate: true, returnRepresentation: false }
    );

    expect(patch).toHaveBeenCalledWith(
      'accounts(00000000-0000-0000-0000-000000000001)',
      { name: 'Contoso' },
      {
        headers: {
          'If-Match': '*'
        }
      }
    );
  });

  it('encodes OData params without raw query concatenation', () => {
    expect(
      buildDataverseODataQuery({
        select: ['name', 'revenue'],
        filter: "name eq 'Contoso & Sons'",
        orderBy: 'createdon desc',
        expand: 'primarycontactid($select=fullname,emailaddress1)',
        top: 25,
        includeCount: true
      })
    ).toBe(
      "?$select=name,revenue&$filter=name%20eq%20'Contoso%20%26%20Sons'&$orderby=createdon%20desc&$expand=primarycontactid(%24select%3Dfullname%2Cemailaddress1)&$top=25&$count=true"
    );

    expect(
      buildDataverseODataQuery({
        fetchXml: '<fetch><entity name="account" /></fetch>'
      })
    ).toBe(
      '?' + 'fetchXml=%3Cfetch%3E%3Centity%20name%3D%22account%22%20%2F%3E%3C%2Ffetch%3E'
    );
  });

  it('bounds pagination parameters', () => {
    expect(
      normalizeDataversePagination({ pageSize: 250, maxPages: 2, maxRecords: 10 })
    ).toEqual({
      pageSize: 250,
      maxPages: 2,
      maxRecords: 10
    });

    expect(() => normalizeDataversePagination({ pageSize: 5001 })).toThrow(ServiceError);
    expect(() => normalizeDataversePagination({ maxPages: 101 })).toThrow(ServiceError);
  });
});

describe('microsoft dataverse metadata helpers', () => {
  it('parses entity and attribute metadata into stable recipe shapes', () => {
    let entity = parseDataverseEntityMetadata({
      LogicalName: 'account',
      EntitySetName: 'accounts',
      SchemaName: 'Account',
      DisplayName: {
        UserLocalizedLabel: { Label: 'Account' }
      },
      Description: {
        LocalizedLabels: [{ Label: 'Business account' }]
      },
      PrimaryIdAttribute: 'accountid',
      PrimaryNameAttribute: 'name',
      OwnershipType: 'UserOwned',
      IsActivity: false,
      IsCustomEntity: true,
      MetadataId: 'metadata-id',
      Attributes: [
        {
          LogicalName: 'name',
          SchemaName: 'Name',
          AttributeType: 'String',
          DisplayName: { UserLocalizedLabel: { Label: 'Account Name' } },
          RequiredLevel: { Value: 'ApplicationRequired' },
          IsValidForCreate: true,
          IsValidForUpdate: true,
          IsValidForRead: true
        }
      ]
    });

    expect(entity).toMatchObject({
      logicalName: 'account',
      entitySetName: 'accounts',
      displayName: 'Account',
      description: 'Business account',
      primaryIdAttribute: 'accountid',
      isCustomEntity: true,
      attributes: [
        {
          logicalName: 'name',
          displayName: 'Account Name',
          requiredLevel: 'ApplicationRequired',
          isValidForCreate: true,
          isValidForUpdate: true
        }
      ]
    });

    expect(
      parseDataverseAttributeMetadata({
        LogicalName: 'parentcustomerid',
        AttributeType: 'Lookup',
        Targets: ['account', 'contact']
      })
    ).toMatchObject({
      logicalName: 'parentcustomerid',
      type: 'Lookup',
      targets: ['account', 'contact']
    });
  });
});

describe('microsoft dataverse client request behavior', () => {
  let createMockClient = (overrides: Partial<Record<keyof DataverseHttpClient, any>> = {}) => {
    let http = {
      get: vi.fn(async () => ({ data: {} })),
      post: vi.fn(async () => ({ data: {} })),
      patch: vi.fn(async () => ({ data: {} })),
      put: vi.fn(async () => ({ data: {} })),
      delete: vi.fn(async () => ({ data: {} })),
      ...overrides
    };
    let client = new DataverseClient({
      token: 'token',
      instanceUrl: 'https://org.crm.dynamics.com',
      http: http as unknown as DataverseHttpClient
    });
    return { client, http };
  };

  it('sends stringified facets, caps top at 100, and unwraps the search response envelope', async () => {
    let post = vi.fn(async () => ({
      data: {
        response: JSON.stringify({
          Value: [{ Id: '00000000-0000-0000-0000-000000000001', EntityName: 'account' }],
          Count: 1
        })
      }
    }));
    let { client, http } = createMockClient({ post });

    let result = (await client.searchRecords({
      search: 'contoso',
      facets: ['entityname,count:100'],
      top: 10
    })) as Record<string, any>;

    expect(http.post).toHaveBeenCalledWith(
      'https://org.crm.dynamics.com/api/search/v2.0/query',
      {
        search: 'contoso',
        count: true,
        top: 10,
        facets: JSON.stringify(['entityname,count:100'])
      }
    );
    expect(result.Value).toEqual([
      { Id: '00000000-0000-0000-0000-000000000001', EntityName: 'account' }
    ]);
    expect(result.Count).toBe(1);

    await expect(client.searchRecords({ search: 'contoso', top: 101 })).rejects.toThrow(
      ServiceError
    );
  });

  it('recovers the record id from OData-EntityId when no representation is returned', async () => {
    let post = vi.fn(async () => ({
      data: '',
      headers: {
        'odata-entityid':
          'https://org.crm.dynamics.com/api/data/v9.2/accounts(00000000-0000-0000-0000-000000000001)'
      }
    }));
    let { client } = createMockClient({ post });

    let record = await client.createRecord(
      'accounts',
      { name: 'Contoso' },
      { returnRepresentation: false }
    );

    expect(record['@odata.id']).toBe(
      'https://org.crm.dynamics.com/api/data/v9.2/accounts(00000000-0000-0000-0000-000000000001)'
    );
  });

  it('fetches lookup targets through the derived-type cast instead of the base attribute select', async () => {
    let get = vi.fn(async (url: string) => {
      if (url.includes('LookupAttributeMetadata')) {
        return {
          data: {
            value: [{ LogicalName: 'parentcustomerid', Targets: ['account', 'contact'] }]
          }
        };
      }
      return {
        data: {
          value: [
            { LogicalName: 'name', AttributeType: 'String' },
            { LogicalName: 'parentcustomerid', AttributeType: 'Lookup' }
          ]
        }
      };
    });
    let { client, http } = createMockClient({ get });

    let attributes = await client.getEntityAttributes('account');

    let baseUrl = http.get.mock.calls[0][0] as string;
    expect(baseUrl).not.toContain('Targets');
    let castUrl = http.get.mock.calls[1][0] as string;
    expect(castUrl).toContain('Microsoft.Dynamics.CRM.LookupAttributeMetadata');
    expect(castUrl).toContain('$select=LogicalName,Targets');
    expect(attributes).toMatchObject([
      { logicalName: 'name' },
      { logicalName: 'parentcustomerid', targets: ['account', 'contact'] }
    ]);
  });

  it('follows a FetchXML nextLink instead of re-running the first page', async () => {
    let nextLink =
      'https://org.crm.dynamics.com/api/data/v9.2/accounts?fetchXml=...&$skiptoken=token';
    let { client, http } = createMockClient();

    await client.fetchXml('accounts', '<fetch />', { nextLink });

    expect(http.get.mock.calls[0][0]).toBe(nextLink);
  });

  it('requests OData annotations when includeAnnotations is set', async () => {
    let { client, http } = createMockClient();

    await client.listRecords('accounts', { includeAnnotations: true, pageSize: 10 });
    expect(http.get.mock.calls[0][1]).toEqual({
      headers: { Prefer: 'odata.maxpagesize=10,odata.include-annotations="*"' }
    });

    await client.getRecord('accounts', '00000000-0000-0000-0000-000000000001', {
      includeAnnotations: true
    });
    expect(http.get.mock.calls[1][1]).toEqual({
      headers: { Prefer: 'odata.include-annotations="*"' }
    });
  });
});

describe('microsoft dataverse ServiceError normalization', () => {
  it('converts Dataverse upstream errors to ServiceError', () => {
    let error = dataverseApiError(
      {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              code: '0x80040220',
              message: 'Principal user is missing prvReadAccount privilege.'
            }
          }
        }
      },
      'list records'
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('microsoft_dataverse_api_error');
    expect(error.data.upstreamStatus).toBe(403);
    expect(error.data.upstreamCode).toBe('0x80040220');
    expect(error.data.message).toContain('Microsoft Dataverse API list records failed');
    expect(error.data.message).toContain('missing prvReadAccount privilege');
  });
});

describe('microsoft dataverse relationship and operation helpers', () => {
  it('builds association and disassociation request bodies for relationship variants', () => {
    let sourceId = '00000000-0000-0000-0000-000000000001';
    let targetId = '00000000-0000-0000-0000-000000000002';

    expect(
      buildDataverseAssociateRequest({
        sourceEntitySetName: 'contacts',
        sourceRecordKey: sourceId,
        navigationProperty: 'parentcustomerid_account',
        targetEntitySetName: 'accounts',
        targetRecordKey: targetId,
        relationshipType: 'single',
        apiBaseUrl: 'https://org.crm.dynamics.com/api/data/v9.2'
      })
    ).toEqual({
      method: 'PUT',
      url: `contacts(${sourceId})/parentcustomerid_account/$ref`,
      body: {
        '@odata.id': `https://org.crm.dynamics.com/api/data/v9.2/accounts(${targetId})`
      }
    });

    expect(
      buildDataverseAssociateRequest({
        sourceEntitySetName: 'accounts',
        sourceRecordKey: sourceId,
        navigationProperty: 'contact_customer_accounts',
        targetEntitySetName: 'contacts',
        targetRecordKey: targetId,
        relationshipType: 'collection',
        apiBaseUrl: 'https://org.crm.dynamics.com/api/data/v9.2'
      })
    ).toEqual({
      method: 'POST',
      url: `accounts(${sourceId})/contact_customer_accounts/$ref`,
      body: {
        '@odata.id': `https://org.crm.dynamics.com/api/data/v9.2/contacts(${targetId})`
      }
    });

    expect(
      buildDataverseDisassociateRequest({
        sourceEntitySetName: 'contacts',
        sourceRecordKey: sourceId,
        navigationProperty: 'parentcustomerid_account',
        relationshipType: 'single'
      })
    ).toEqual({
      method: 'DELETE',
      url: `contacts(${sourceId})/parentcustomerid_account/$ref`
    });
  });

  it('builds bound and unbound action/function request variants', () => {
    let leadId = '00000000-0000-0000-0000-000000000001';

    expect(
      buildDataverseOperationRequest({
        operationType: 'action',
        bindingType: 'entity',
        operationName: 'QualifyLead',
        entitySetName: 'leads',
        recordKey: leadId,
        requestBody: { CreateAccount: true }
      })
    ).toEqual({
      method: 'POST',
      url: `leads(${leadId})/Microsoft.Dynamics.CRM.QualifyLead`,
      body: { CreateAccount: true }
    });

    expect(
      buildDataverseOperationRequest({
        operationType: 'function',
        operationName: 'WhoAmI'
      })
    ).toEqual({
      method: 'GET',
      url: 'WhoAmI()'
    });

    expect(
      buildDataverseOperationRequest({
        operationType: 'function',
        bindingType: 'collection',
        operationName: 'RetrieveTotalRecordCount',
        entitySetName: 'accounts',
        parameters: { EntityNames: ['account', 'contact'] }
      })
    ).toEqual({
      method: 'GET',
      url: 'accounts/Microsoft.Dynamics.CRM.RetrieveTotalRecordCount(EntityNames=@EntityNames)?@EntityNames=%5B%22account%22%2C%22contact%22%5D'
    });
  });
});

describe('microsoft dataverse file and batch helpers', () => {
  it('creates attachment-ready file metadata without inline output fields', () => {
    let file = buildDataverseFileAttachmentData({
      content: Buffer.from('hello'),
      headers: {
        'content-type': 'text/plain',
        'content-disposition': 'attachment; filename="hello.txt"'
      }
    });

    expect(file.attachment).toEqual({
      mimeType: 'text/plain',
      content: {
        type: 'content',
        encoding: 'base64',
        content: Buffer.from('hello').toString('base64')
      }
    });
    expect(file.metadata).toEqual({
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      sizeBytes: 5,
      attachmentCount: 1
    });

    expect(
      buildDataverseFileColumnValueUrl({
        entitySetName: 'accounts',
        recordKey: '00000000-0000-0000-0000-000000000001',
        columnName: 'sample_file'
      })
    ).toBe('accounts(00000000-0000-0000-0000-000000000001)/sample_file/$value');
  });

  it('builds Dataverse file block upload request bodies', () => {
    expect(
      buildInitializeFileBlocksUploadBody({
        entityLogicalName: 'account',
        primaryIdAttribute: 'accountid',
        recordId: '00000000-0000-0000-0000-000000000001',
        columnName: 'sample_file',
        fileName: 'quote.pdf'
      })
    ).toEqual({
      Target: {
        '@odata.type': 'Microsoft.Dynamics.CRM.account',
        accountid: '00000000-0000-0000-0000-000000000001'
      },
      FileAttributeName: 'sample_file',
      FileName: 'quote.pdf'
    });

    expect(
      buildCommitFileBlocksUploadBody({
        continuationToken: 'token',
        fileName: 'quote.pdf',
        mimeType: 'application/pdf',
        blockList: ['MDAwMDAw']
      })
    ).toEqual({
      FileContinuationToken: 'token',
      FileName: 'quote.pdf',
      MimeType: 'application/pdf',
      BlockList: ['MDAwMDAw']
    });
  });

  it('builds multipart Dataverse batch request bodies', () => {
    let request = buildDataverseBatchRequest(
      [
        {
          method: 'GET',
          url: '/accounts?$select=name',
          headers: { Prefer: 'odata.maxpagesize=10' }
        },
        {
          method: 'PATCH',
          url: 'accounts(00000000-0000-0000-0000-000000000001)',
          body: { name: 'Contoso' },
          contentId: '1'
        }
      ],
      {
        batchBoundary: 'batch_test',
        changeSetBoundary: 'changeset_test'
      }
    );

    expect(request).toMatchObject({
      method: 'POST',
      url: '$batch',
      headers: {
        'Content-Type': 'multipart/mixed;boundary=batch_test'
      }
    });
    expect(request.body).toContain('--batch_test');
    expect(request.body).toContain('GET accounts?$select=name HTTP/1.1');
    expect(request.body).toContain('Prefer: odata.maxpagesize=10');
    expect(request.body).toContain('Content-Type: multipart/mixed;boundary=changeset_test');
    expect(request.body).toContain('Content-ID: 1');
    expect(request.body).toContain(
      'PATCH accounts(00000000-0000-0000-0000-000000000001) HTTP/1.1'
    );
    expect(request.body).toContain('{"name":"Contoso"}');
    expect(request.body).toContain('--changeset_test--');
    expect(request.body).toContain('--batch_test--');
  });
});
