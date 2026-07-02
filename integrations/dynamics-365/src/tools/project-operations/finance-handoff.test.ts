import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { buildImportStagingErrorFileUrlRequest } from './finance-handoff';

describe('Project Operations finance handoff helpers', () => {
  it('builds the import staging error file URL request with entityName', () => {
    expect(
      buildImportStagingErrorFileUrlRequest({
        executionId: 'import-123',
        entityName: 'ProjectOperationsEntity'
      })
    ).toEqual({
      path: 'data/DataManagementDefinitionGroups/Microsoft.Dynamics.DataEntities.GetImportStagingErrorFileUrl',
      body: {
        executionId: 'import-123',
        entityName: 'ProjectOperationsEntity'
      }
    });
  });

  it('requires entityName for import staging error file URL requests', () => {
    expect(() =>
      buildImportStagingErrorFileUrlRequest({
        executionId: 'import-123'
      })
    ).toThrow(ServiceError);
  });
});
