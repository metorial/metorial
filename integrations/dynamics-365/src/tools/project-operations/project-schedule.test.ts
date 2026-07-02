import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  assertProjectScheduleDelegatedAuth,
  buildProjectScheduleOperation,
  normalizeProjectScheduleOutput
} from './project-schedule';

describe('Project Operations schedule API helpers', () => {
  it('requires delegated OAuth for schedule API actions', () => {
    expect(() => assertProjectScheduleDelegatedAuth({})).toThrow(ServiceError);

    expect(() =>
      assertProjectScheduleDelegatedAuth({
        refreshToken: 'refresh-token'
      })
    ).not.toThrow();
  });

  it('builds V2 create requests and normalizes Power Automate @odata aliases', () => {
    expect(
      buildProjectScheduleOperation({
        action: 'create_scheduling_entities',
        operationSetId: 'operation-set-1',
        entities: [
          {
            '@@odata.type': 'Microsoft.Dynamics.CRM.msdyn_projecttask',
            msdyn_subject: 'Design Review'
          }
        ]
      })
    ).toEqual({
      operationName: 'msdyn_PssCreateV2',
      requestBody: {
        EntityCollection: [
          {
            '@odata.type': 'Microsoft.Dynamics.CRM.msdyn_projecttask',
            msdyn_subject: 'Design Review'
          }
        ],
        OperationSetId: 'operation-set-1'
      }
    });
  });

  it('requires explicit delete confirmation for scheduling deletes', () => {
    expect(() =>
      buildProjectScheduleOperation({
        action: 'delete_scheduling_entity',
        operationSetId: 'operation-set-1',
        recordId: '11111111-1111-1111-1111-111111111111',
        entityLogicalName: 'msdyn_projecttask'
      })
    ).toThrow(ServiceError);
  });

  it('serializes resource assignment contour updates for the schedule API', () => {
    let operation = buildProjectScheduleOperation({
      action: 'update_resource_assignment_contour',
      operationSetId: 'operation-set-1',
      resourceAssignmentId: '22222222-2222-2222-2222-222222222222',
      updatedContours: [
        {
          start: '2026-07-01T00:00:00Z',
          end: '2026-07-02T00:00:00Z',
          minutes: 120
        }
      ]
    });

    expect(operation).toEqual({
      operationName: 'msdyn_PssUpdateResourceAssignmentContourV1',
      requestBody: {
        ResourceAssignmentId: '22222222-2222-2222-2222-222222222222',
        UpdatedContours:
          '[{"start":"2026-07-01T00:00:00Z","end":"2026-07-02T00:00:00Z","minutes":120}]',
        OperationSetId: 'operation-set-1'
      }
    });
  });

  it('rejects contour updates over the Project schedule API limit', () => {
    expect(() =>
      buildProjectScheduleOperation({
        action: 'update_resource_assignment_contour',
        operationSetId: 'operation-set-1',
        resourceAssignmentId: '22222222-2222-2222-2222-222222222222',
        updatedContours: Array.from({ length: 101 }, (_, index) => ({
          start: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T00:00:00Z`,
          end: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T01:00:00Z`,
          minutes: 60
        }))
      })
    ).toThrow(ServiceError);
  });

  it('extracts OperationSetResponse identifiers from action results', () => {
    expect(
      normalizeProjectScheduleOutput('create_scheduling_entity', 'msdyn_PssCreateV1', {
        OperationSetResponse:
          '{"operationSetId":"operation-set-1","operationSetDetailId":"detail-1","operationType":"Create","recordId":"record-1","correlationId":"correlation-1"}'
      })
    ).toMatchObject({
      action: 'create_scheduling_entity',
      operationName: 'msdyn_PssCreateV1',
      operationSetId: 'operation-set-1',
      operationSetDetailId: 'detail-1',
      operationType: 'Create',
      recordId: 'record-1',
      correlationId: 'correlation-1'
    });
  });

  it('preserves the input OperationSet ID when execute responses omit it', () => {
    expect(
      normalizeProjectScheduleOutput(
        'execute_operation_set',
        'msdyn_ExecuteOperationSetV1',
        {},
        'operation-set-1'
      )
    ).toMatchObject({
      action: 'execute_operation_set',
      operationName: 'msdyn_ExecuteOperationSetV1',
      operationSetId: 'operation-set-1'
    });
  });
});
