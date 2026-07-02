import {
  buildFinOpsDataPath,
  createDynamicsFinOpsHttpClient,
  DATA_MANAGEMENT_ACTION_PATHS,
  dynamicsFinOpsApiError,
  normalizeDataManagementResponseValue
} from '@slates/dynamics-finops-recipes';
import { requestAxiosData, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import { projectOperationsValidationError } from './errors';
import { createProjectOperationsFinOpsClient } from './shared';

let financeHandoffActionSchema = z
  .enum([
    'export_to_package',
    'import_from_package',
    'get_execution_summary_status',
    'get_execution_summary_page_url',
    'get_exported_package_url',
    'get_import_staging_error_file_url'
  ])
  .describe('Finance and Operations Data Management package action.');

let inputSchema = z.object({
  action: financeHandoffActionSchema,
  finOpsBaseUrl: z
    .string()
    .optional()
    .describe('Override Finance and Operations environment URL for this call.'),
  definitionGroupId: z
    .string()
    .optional()
    .describe(
      'Data Management definition group ID. Required for export_to_package and import_from_package.'
    ),
  packageName: z.string().optional().describe('Package file name for export_to_package.'),
  packageUrl: z.string().optional().describe('Package URL for import_from_package.'),
  executionId: z
    .string()
    .optional()
    .describe('Data Management execution ID. Required for status and URL lookup actions.'),
  entityName: z
    .string()
    .optional()
    .describe('Data Management entity name. Required for get_import_staging_error_file_url.'),
  reExecute: z
    .boolean()
    .optional()
    .describe('When true, re-executes an existing export execution.'),
  execute: z
    .boolean()
    .optional()
    .describe(
      'For import_from_package only. Defaults to false so the package is staged instead of executed.'
    ),
  overwrite: z
    .boolean()
    .optional()
    .describe('For import_from_package only. Defaults to false.'),
  legalEntityId: z
    .string()
    .optional()
    .describe('Finance and Operations legal entity for Data Management package execution.'),
  confirmImport: z
    .boolean()
    .optional()
    .describe(
      'Must be true for import_from_package because it writes to Finance and Operations staging/import workflows.'
    )
});

let outputSchema = z.object({
  action: financeHandoffActionSchema,
  executionId: z.string().optional(),
  result: z.unknown().optional(),
  url: z.string().optional(),
  status: z.string().optional(),
  rawStatus: z.unknown().optional(),
  isTerminal: z.boolean().optional(),
  isSuccess: z.boolean().optional()
});

let requireText = (value: string | undefined, field: string) => {
  if (!value?.trim()) {
    throw projectOperationsValidationError(`${field} is required.`);
  }

  return value.trim();
};

let requireExecutionId = (value: string | undefined) => requireText(value, 'executionId');

let normalizeUrlResult = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    let nested = (value as { value?: unknown }).value;
    return typeof nested === 'string' ? nested : undefined;
  }
  return undefined;
};

export let buildImportStagingErrorFileUrlRequest = (input: {
  executionId?: string;
  entityName?: string;
}) => ({
  path: buildFinOpsDataPath(DATA_MANAGEMENT_ACTION_PATHS.getImportStagingErrorFileUrl),
  body: {
    executionId: requireExecutionId(input.executionId),
    entityName: requireText(input.entityName, 'entityName')
  }
});

let getImportStagingErrorFileUrl = async (params: {
  baseUrl: string;
  token: string;
  executionId: string;
  entityName: string;
}) => {
  let request = buildImportStagingErrorFileUrlRequest(params);
  let api = createDynamicsFinOpsHttpClient({
    baseUrl: params.baseUrl,
    token: params.token
  });
  let response = await requestAxiosData<unknown>(
    'get import staging error file URL',
    () => api.post(request.path, request.body) as Promise<any>,
    dynamicsFinOpsApiError
  );

  return normalizeDataManagementResponseValue(response);
};

export let manageFinanceHandoff = SlateTool.create(spec, {
  name: 'Manage Finance Handoff',
  key: 'manage_finance_handoff',
  description:
    'Start and inspect Dynamics 365 Finance and Operations Data Management package handoff executions for Project Operations finance integration.',
  constraints: [
    'Requires auth to include a Finance and Operations token for the configured environment URL.',
    'Import defaults to execute=false and requires confirmImport=true. Posting, invoice confirmation, and ledger posting are not exposed.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(inputSchema)
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = createProjectOperationsFinOpsClient(ctx, {
      finOpsBaseUrl: ctx.input.finOpsBaseUrl,
      legalEntityId: ctx.input.legalEntityId
    });

    if (ctx.input.action === 'export_to_package') {
      let result = await client.exportToPackage({
        definitionGroupId: requireText(ctx.input.definitionGroupId, 'definitionGroupId'),
        packageName: requireText(ctx.input.packageName, 'packageName'),
        executionId: ctx.input.executionId,
        reExecute: ctx.input.reExecute,
        legalEntityId: ctx.input.legalEntityId
      });
      let executionId = typeof result === 'string' ? result : ctx.input.executionId;

      return {
        output: {
          action: ctx.input.action,
          executionId,
          result
        },
        message: `Started Finance and Operations export package handoff${executionId ? ` **${executionId}**` : ''}.`
      };
    }

    if (ctx.input.action === 'import_from_package') {
      if (ctx.input.confirmImport !== true) {
        throw projectOperationsValidationError(
          'import_from_package requires confirmImport=true.'
        );
      }

      let result = await client.importFromPackage({
        definitionGroupId: requireText(ctx.input.definitionGroupId, 'definitionGroupId'),
        packageUrl: requireText(ctx.input.packageUrl, 'packageUrl'),
        executionId: ctx.input.executionId,
        execute: ctx.input.execute ?? false,
        overwrite: ctx.input.overwrite ?? false,
        legalEntityId: ctx.input.legalEntityId
      });
      let executionId = typeof result === 'string' ? result : ctx.input.executionId;

      return {
        output: {
          action: ctx.input.action,
          executionId,
          result
        },
        message: `Started Finance and Operations import handoff${executionId ? ` **${executionId}**` : ''}.`
      };
    }

    let executionId = requireExecutionId(ctx.input.executionId);

    if (ctx.input.action === 'get_execution_summary_status') {
      let status = await client.getExecutionSummaryStatus({ executionId });

      return {
        output: {
          action: ctx.input.action,
          executionId,
          rawStatus: status.rawStatus,
          status: status.status,
          isTerminal: status.isTerminal,
          isSuccess: status.isSuccess
        },
        message: `Finance and Operations execution **${executionId}** status is **${status.status}**.`
      };
    }

    if (ctx.input.action === 'get_execution_summary_page_url') {
      let result = await client.getExecutionSummaryPageUrl({ executionId });
      let url = normalizeUrlResult(result);

      return {
        output: {
          action: ctx.input.action,
          executionId,
          result,
          url
        },
        message: `Retrieved Finance and Operations execution summary page URL for **${executionId}**.`
      };
    }

    if (ctx.input.action === 'get_exported_package_url') {
      let result = await client.getExportedPackageUrl({ executionId });
      let url = normalizeUrlResult(result);

      return {
        output: {
          action: ctx.input.action,
          executionId,
          result,
          url
        },
        message: `Retrieved exported package URL for **${executionId}**.`
      };
    }

    if (!ctx.auth.finOpsToken) {
      throw projectOperationsValidationError(
        'Finance handoff requires a Finance and Operations token.'
      );
    }

    let result = await getImportStagingErrorFileUrl({
      baseUrl: client.getBaseUrl(),
      token: ctx.auth.finOpsToken,
      executionId,
      entityName: requireText(ctx.input.entityName, 'entityName')
    });
    let url = normalizeUrlResult(result);

    return {
      output: {
        action: ctx.input.action,
        executionId,
        result,
        url
      },
      message: `Retrieved import staging error file URL for **${executionId}**.`
    };
  })
  .build();
