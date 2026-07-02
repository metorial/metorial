import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let dataverseMocks = vi.hoisted(() => ({
  listRecords: vi.fn(),
  getRecord: vi.fn(),
  updateRecord: vi.fn()
}));

vi.mock('./shared', () => ({
  createProjectOperationsDataverseClient: vi.fn(() => ({
    listRecords: dataverseMocks.listRecords,
    getRecord: dataverseMocks.getRecord,
    updateRecord: dataverseMocks.updateRecord
  })),
  createProjectOperationsFinOpsClient: vi.fn()
}));

import { provider } from '../../index';

let createClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth_organizations',
        output: {
          dataverseToken: 'test-token',
          dataverseInstanceUrl: 'https://example.crm.dynamics.com'
        }
      }
    }
  });

describe('manage_projects', () => {
  beforeEach(() => {
    dataverseMocks.listRecords.mockReset();
    dataverseMocks.getRecord.mockReset();
    dataverseMocks.updateRecord.mockReset();
  });

  it('does not combine Dataverse $top with configured page size', async () => {
    dataverseMocks.listRecords.mockResolvedValueOnce({
      records: [],
      nextLink: null
    });

    let client = createLocalSlateTestClient({
      slate: provider,
      state: {
        config: {
          projectOperationsDefaultPageSize: 250
        },
        auth: {
          authenticationMethodId: 'oauth_organizations',
          output: {
            dataverseToken: 'test-token',
            dataverseInstanceUrl: 'https://example.crm.dynamics.com'
          }
        }
      }
    });
    await client.invokeTool('project_operations_manage_projects', {
      action: 'list',
      top: 10
    });

    expect(dataverseMocks.listRecords).toHaveBeenCalledWith('msdyn_projects', {
      select: [
        'msdyn_projectid',
        'msdyn_subject',
        'msdyn_scheduledstart',
        'msdyn_scheduledend'
      ],
      filter: undefined,
      orderBy: undefined,
      expand: undefined,
      top: 10,
      pageSize: undefined,
      nextLink: undefined,
      includeCount: undefined
    });
  });

  it('uses the pre-read id when update_draft suppresses record representation', async () => {
    dataverseMocks.getRecord.mockResolvedValueOnce({
      msdyn_projectid: 'project-1'
    });
    dataverseMocks.updateRecord.mockResolvedValueOnce(undefined);

    let client = createClient();
    let result = await client.invokeTool('project_operations_manage_projects', {
      action: 'update_draft',
      recordId: 'project-1',
      projectName: 'Reconciled project',
      returnRepresentation: false
    });

    expect(dataverseMocks.getRecord).toHaveBeenCalledWith('msdyn_projects', 'project-1', {
      select: ['msdyn_projectid']
    });
    expect(dataverseMocks.updateRecord).toHaveBeenCalledWith(
      'msdyn_projects',
      'project-1',
      {
        msdyn_subject: 'Reconciled project'
      },
      { preventCreate: true, returnRepresentation: false }
    );
    expect(result.output).toEqual({
      action: 'update_draft',
      entitySetName: 'msdyn_projects',
      record: undefined,
      recordId: 'project-1'
    });
  });
});
