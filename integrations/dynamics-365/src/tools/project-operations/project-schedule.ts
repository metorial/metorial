import type { DataverseRecord } from '@slates/microsoft-dataverse-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import { projectOperationsValidationError } from './errors';
import { createProjectOperationsDataverseClient } from './shared';

let recordSchema = z.record(z.string(), z.unknown());
let contourSchema = z.object({
  start: z.string().describe('Contour start date/time.'),
  end: z.string().describe('Contour end date/time.'),
  minutes: z.number().describe('Planned work minutes for this contour slice.')
});

let scheduleActionSchema = z
  .enum([
    'create_project',
    'create_team_member',
    'create_operation_set',
    'create_scheduling_entity',
    'create_scheduling_entities',
    'update_scheduling_entity',
    'update_scheduling_entities',
    'delete_scheduling_entity',
    'update_resource_assignment_contour',
    'execute_operation_set',
    'abandon_operation_set'
  ])
  .describe(
    'Project schedule API action. create/update/delete scheduling entity actions require an OperationSet.'
  );

let inputSchema = z.object({
  action: scheduleActionSchema,
  dataverseInstanceUrl: z
    .string()
    .optional()
    .describe('Override Dataverse environment URL for this call.'),
  operationSetId: z
    .string()
    .optional()
    .describe(
      'Project schedule OperationSet ID. Required for scheduling entity create/update/delete, contour update, execute, and abandon actions.'
    ),
  projectId: z
    .string()
    .optional()
    .describe('Project GUID. Required for create_operation_set.'),
  description: z
    .string()
    .optional()
    .describe('OperationSet description for create_operation_set.'),
  entity: recordSchema
    .optional()
    .describe(
      'Scheduling entity payload for single-entity actions. Include @odata.type, such as Microsoft.Dynamics.CRM.msdyn_projecttask.'
    ),
  entities: z
    .array(recordSchema)
    .optional()
    .describe(
      'Scheduling entity payloads for V2 multi-entity create/update actions. Each entity should include @odata.type.'
    ),
  recordId: z.string().optional().describe('Record GUID for delete_scheduling_entity.'),
  entityLogicalName: z
    .string()
    .optional()
    .describe(
      'Dataverse logical name for delete_scheduling_entity, such as msdyn_projecttask.'
    ),
  resourceAssignmentId: z
    .string()
    .optional()
    .describe('Resource assignment GUID for update_resource_assignment_contour.'),
  updatedContours: z
    .array(contourSchema)
    .optional()
    .describe(
      'Updated resource assignment contour slices. Serialized to the Project schedule API UpdatedContours parameter.'
    ),
  confirmDelete: z.boolean().optional().describe('Must be true for delete_scheduling_entity.')
});

let outputSchema = z.object({
  action: scheduleActionSchema,
  operationName: z.string(),
  result: z.unknown().optional(),
  projectId: z.string().optional(),
  teamMemberId: z.string().optional(),
  operationSetId: z.string().optional(),
  operationSetDetailId: z.string().optional(),
  operationType: z.string().optional(),
  recordId: z.string().optional(),
  correlationId: z.string().optional()
});

export type ProjectScheduleInput = z.infer<typeof inputSchema>;

type ProjectScheduleOperation = {
  operationName: string;
  requestBody: DataverseRecord;
};

type ProjectScheduleAuth = {
  dataverseRefreshToken?: string;
  refreshToken?: string;
};

let isRecord = (value: unknown): value is DataverseRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw projectOperationsValidationError(`${field} is required.`);
  }

  return value.trim();
};

let normalizeODataTypeAliases = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeODataTypeAliases);
  }

  if (!isRecord(value)) {
    return value;
  }

  let normalized: DataverseRecord = {};
  for (let [key, nestedValue] of Object.entries(value)) {
    normalized[key === '@@odata.type' ? '@odata.type' : key] =
      normalizeODataTypeAliases(nestedValue);
  }
  return normalized;
};

let requireRecord = (value: unknown, field: string) => {
  if (!isRecord(value)) {
    throw projectOperationsValidationError(`${field} is required.`);
  }

  return normalizeODataTypeAliases(value) as DataverseRecord;
};

let requireRecordArray = (value: unknown, field: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw projectOperationsValidationError(`${field} requires at least one entity.`);
  }

  return value.map((item, index) => requireRecord(item, `${field}[${index}]`));
};

let requireOperationSetId = (input: ProjectScheduleInput) =>
  requireText(input.operationSetId, 'operationSetId');

export let assertProjectScheduleDelegatedAuth = (auth: ProjectScheduleAuth) => {
  let refreshToken = auth.dataverseRefreshToken ?? auth.refreshToken;
  if (typeof refreshToken === 'string' && refreshToken.trim() !== '') {
    return;
  }

  throw projectOperationsValidationError(
    'Project schedule API actions require delegated Work Only OAuth for a user with a Microsoft Project license. Microsoft does not support client credentials, application users, system users, or integration users for these actions.',
    { reason: 'dynamics_project_operations_schedule_delegated_auth_required' }
  );
};

let requireContours = (value: unknown) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw projectOperationsValidationError(
      'updatedContours requires at least one contour slice.'
    );
  }

  if (value.length > 100) {
    throw projectOperationsValidationError(
      'updatedContours cannot contain more than 100 contour slices.'
    );
  }

  return value;
};

export let buildProjectScheduleOperation = (
  input: ProjectScheduleInput
): ProjectScheduleOperation => {
  if (input.action === 'create_project') {
    return {
      operationName: 'msdyn_CreateProjectV1',
      requestBody: { Project: requireRecord(input.entity, 'entity') }
    };
  }

  if (input.action === 'create_team_member') {
    return {
      operationName: 'msdyn_CreateTeamMemberV1',
      requestBody: { TeamMember: requireRecord(input.entity, 'entity') }
    };
  }

  if (input.action === 'create_operation_set') {
    return {
      operationName: 'msdyn_CreateOperationSetV1',
      requestBody: {
        ProjectId: requireText(input.projectId, 'projectId'),
        Description: input.description?.trim() || 'Slate Project Operations schedule work'
      }
    };
  }

  if (input.action === 'create_scheduling_entity') {
    return {
      operationName: 'msdyn_PssCreateV1',
      requestBody: {
        Entity: requireRecord(input.entity, 'entity'),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'create_scheduling_entities') {
    return {
      operationName: 'msdyn_PssCreateV2',
      requestBody: {
        EntityCollection: requireRecordArray(input.entities, 'entities'),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'update_scheduling_entity') {
    return {
      operationName: 'msdyn_PssUpdateV1',
      requestBody: {
        Entity: requireRecord(input.entity, 'entity'),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'update_scheduling_entities') {
    return {
      operationName: 'msdyn_PssUpdateV2',
      requestBody: {
        EntityCollection: requireRecordArray(input.entities, 'entities'),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'delete_scheduling_entity') {
    if (input.confirmDelete !== true) {
      throw projectOperationsValidationError(
        'delete_scheduling_entity requires confirmDelete=true.'
      );
    }

    return {
      operationName: 'msdyn_PssDeleteV1',
      requestBody: {
        RecordId: requireText(input.recordId, 'recordId'),
        EntityLogicalName: requireText(input.entityLogicalName, 'entityLogicalName'),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'update_resource_assignment_contour') {
    return {
      operationName: 'msdyn_PssUpdateResourceAssignmentContourV1',
      requestBody: {
        ResourceAssignmentId: requireText(input.resourceAssignmentId, 'resourceAssignmentId'),
        UpdatedContours: JSON.stringify(requireContours(input.updatedContours)),
        OperationSetId: requireOperationSetId(input)
      }
    };
  }

  if (input.action === 'execute_operation_set') {
    return {
      operationName: 'msdyn_ExecuteOperationSetV1',
      requestBody: { OperationSetId: requireOperationSetId(input) }
    };
  }

  return {
    operationName: 'msdyn_AbandonOperationSetV1',
    requestBody: { OperationSetId: requireOperationSetId(input) }
  };
};

let parseOperationSetResponse = (result: unknown) => {
  if (!isRecord(result) || typeof result.OperationSetResponse !== 'string') {
    return undefined;
  }

  try {
    let parsed = JSON.parse(result.OperationSetResponse);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

let stringField = (source: unknown, field: string) => {
  if (!isRecord(source)) return undefined;
  let value = source[field];
  return typeof value === 'string' ? value : undefined;
};

export let normalizeProjectScheduleOutput = (
  action: ProjectScheduleInput['action'],
  operationName: string,
  result: unknown,
  inputOperationSetId?: string
) => {
  let operationSetResponse = parseOperationSetResponse(result);

  return {
    action,
    operationName,
    result,
    projectId: stringField(result, 'ProjectId'),
    teamMemberId: stringField(result, 'TeamMemberId'),
    operationSetId:
      stringField(result, 'OperationSetId') ??
      stringField(operationSetResponse, 'operationSetId') ??
      inputOperationSetId,
    operationSetDetailId: stringField(operationSetResponse, 'operationSetDetailId'),
    operationType: stringField(operationSetResponse, 'operationType'),
    recordId: stringField(operationSetResponse, 'recordId'),
    correlationId: stringField(operationSetResponse, 'correlationId')
  };
};

let scheduleMessage = (output: ReturnType<typeof normalizeProjectScheduleOutput>) => {
  if (output.action === 'create_operation_set') {
    return `Created Project schedule OperationSet${output.operationSetId ? ` **${output.operationSetId}**` : ''}.`;
  }

  if (output.action === 'execute_operation_set') {
    return `Executed Project schedule OperationSet **${output.operationSetId ?? 'requested'}**.`;
  }

  if (output.action === 'abandon_operation_set') {
    return `Abandoned Project schedule OperationSet **${output.operationSetId ?? 'requested'}**.`;
  }

  return `Submitted Project schedule action **${output.operationName}**.`;
};

export let manageProjectSchedule = SlateTool.create(spec, {
  name: 'Manage Project Schedule',
  key: 'manage_project_schedule',
  description:
    'Run Dynamics 365 Project Operations Project schedule APIs for scheduling entities such as project tasks, resource assignments, dependencies, buckets, team members, sprints, labels, and OperationSets.',
  constraints: [
    'Microsoft Project schedule APIs require a delegated user with a Microsoft Project license; application/client-credentials users are not supported by Microsoft for these actions.',
    'Create, update, and delete scheduling entity actions require an OperationSet. Execute the OperationSet only after queued changes are complete.',
    'OperationSets can contain up to 200 operations, and resource assignment contour updates can contain up to 100 time slices.',
    'delete_scheduling_entity requires confirmDelete=true.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    assertProjectScheduleDelegatedAuth(ctx.auth);
    let request = buildProjectScheduleOperation(ctx.input);
    let client = createProjectOperationsDataverseClient(ctx, {
      dataverseInstanceUrl: ctx.input.dataverseInstanceUrl
    });
    let result = await client.invokeOperation({
      operationType: 'action',
      operationName: request.operationName,
      requestBody: request.requestBody
    });
    let output = normalizeProjectScheduleOutput(
      ctx.input.action,
      request.operationName,
      result,
      ctx.input.operationSetId
    );

    return {
      output,
      message: scheduleMessage(output)
    };
  })
  .build();
