import {
  createDynamicsFinOpsClient,
  createFinOpsExecutionId,
  dynamicsFinOpsServiceError,
  dataManagementPackageOperationInputSchema as recipeDataManagementPackageOperationInputSchema,
  validateDataManagementPackageOperationInput
} from '@slates/dynamics-finops-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import type { FinOpsToolContext } from './shared';

let connectionInputFields = {
  finOpsBaseUrl: z
    .string()
    .optional()
    .describe('Override Finance and Operations environment URL for this request.')
};

let financeDataManagementActionSchema = z
  .enum([
    'export_to_package',
    'import_from_package',
    'get_azure_write_url',
    'get_execution_summary_status',
    'get_exported_package_url'
  ])
  .describe(
    'Data Management package action variant. Import staging error file URL lookup is deferred until entityName is supported.'
  );

export let financeDataManagementPackageOperationInputSchema =
  recipeDataManagementPackageOperationInputSchema.extend({
    ...connectionInputFields,
    action: financeDataManagementActionSchema,
    confirmImport: z
      .boolean()
      .optional()
      .describe(
        'Required as true for import_from_package because imports write to Finance and Operations staging or target workflows.'
      )
  });

let resolveBaseUrl = (ctx: FinOpsToolContext) => {
  let baseUrl = ctx.input.finOpsBaseUrl ?? ctx.config?.finOpsBaseUrl ?? ctx.auth.finOpsBaseUrl;

  if (!baseUrl) {
    throw dynamicsFinOpsServiceError('Finance and Operations finOpsBaseUrl is required.');
  }

  return baseUrl;
};

let requireFinOpsToken = (ctx: FinOpsToolContext) => {
  if (!ctx.auth.finOpsToken?.trim()) {
    throw dynamicsFinOpsServiceError(
      'Finance Data Management requires finOpsToken from oauth_common, oauth_organizations, or microsoft_client_credentials auth.'
    );
  }

  return ctx.auth.finOpsToken;
};

let createClient = (ctx: FinOpsToolContext) =>
  createDynamicsFinOpsClient({
    auth: {
      token: requireFinOpsToken(ctx)
    },
    config: {
      baseUrl: resolveBaseUrl(ctx),
      defaultLegalEntity: ctx.config?.finOpsDefaultLegalEntity
    }
  });

let stringResult = (value: unknown) => (typeof value === 'string' ? value : undefined);

let optionalNonEmptyString = (value: string | undefined) => {
  let trimmed = value?.trim();
  return trimmed || undefined;
};

let resolveExecutionId = (executionId: string | undefined, prefix: string) =>
  optionalNonEmptyString(executionId) ?? createFinOpsExecutionId(prefix);

let normalizeStatusIsTerminal = (status: { status: string; isTerminal: boolean }) =>
  status.status === 'unknown' ? false : status.isTerminal;

export let runDataManagementPackageOperation = SlateTool.create(spec, {
  name: 'Run Finance Data Management Package Operation',
  key: 'run_data_management_package_operation',
  description:
    'Start or inspect Dynamics 365 Finance Data Management package export/import workflows. File bytes are not returned in JSON output.',
  instructions: [
    'Use export_to_package or import_from_package to start package workflows, then poll get_execution_summary_status with the returned executionId.',
    'For import_from_package, set confirmImport=true. If execute is omitted, the package is staged with execute=false; set execute=true only when ready to run target processing.',
    'To import a local package, first call get_azure_write_url, upload the package to the returned blobUrl with an HTTP PUT (x-ms-blob-type: BlockBlob), then pass that URL as packageUrl to import_from_package.'
  ],
  constraints: [
    'This tool does not download package files or import error files.',
    'Import staging error file URL lookup is deferred until entityName is supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(financeDataManagementPackageOperationInputSchema)
  .output(
    z.object({
      action: z.string(),
      executionId: z.string().optional(),
      status: z.string().optional(),
      isTerminal: z.boolean().optional(),
      isSuccess: z.boolean().optional(),
      url: z.string().optional(),
      blobId: z.string().optional(),
      result: z.unknown().optional()
    })
  )
  .handleInvocation(async rawCtx => {
    let ctx = rawCtx as FinOpsToolContext & {
      input: FinOpsToolContext['input'] &
        z.infer<typeof financeDataManagementPackageOperationInputSchema>;
    };
    let input = validateDataManagementPackageOperationInput(ctx.input) as z.infer<
      typeof financeDataManagementPackageOperationInputSchema
    >;

    if (input.action === 'import_from_package' && ctx.input.confirmImport !== true) {
      throw dynamicsFinOpsServiceError('import_from_package requires confirmImport=true.');
    }

    let client = createClient(ctx);

    if (input.action === 'export_to_package') {
      let executionId = resolveExecutionId(input.executionId, 'finance-export');
      let result = await client.exportToPackage({
        definitionGroupId: input.definitionGroupId ?? '',
        packageName: input.packageName ?? '',
        executionId,
        reExecute: input.reExecute,
        legalEntityId: input.legalEntityId
      });
      let returnedExecutionId = stringResult(result) ?? executionId;

      return {
        output: {
          action: input.action,
          executionId: returnedExecutionId,
          result
        },
        message: `Started Finance Data Management export **${returnedExecutionId}**.`
      };
    }

    if (input.action === 'import_from_package') {
      let executionId = resolveExecutionId(input.executionId, 'finance-import');
      let result = await client.importFromPackage({
        definitionGroupId: input.definitionGroupId ?? '',
        packageUrl: input.packageUrl ?? '',
        executionId,
        execute: input.execute ?? false,
        overwrite: input.overwrite,
        legalEntityId: input.legalEntityId
      });
      let returnedExecutionId = stringResult(result) ?? executionId;

      return {
        output: {
          action: input.action,
          executionId: returnedExecutionId,
          result
        },
        message: `Started Finance Data Management import **${returnedExecutionId}**.`
      };
    }

    if (input.action === 'get_azure_write_url') {
      let blob = await client.getAzureWriteUrl({ uniqueFileName: input.uniqueFileName });

      return {
        output: {
          action: input.action,
          url: blob.blobUrl,
          blobId: blob.blobId,
          result: blob.raw
        },
        message:
          'Retrieved a writable Azure blob URL. Upload the package with HTTP PUT (x-ms-blob-type: BlockBlob), then pass the URL as packageUrl to import_from_package.'
      };
    }

    if (input.action === 'get_execution_summary_status') {
      let status = await client.getExecutionSummaryStatus({
        executionId: input.executionId ?? ''
      });

      return {
        output: {
          action: input.action,
          executionId: input.executionId,
          status: status.status,
          isTerminal: normalizeStatusIsTerminal(status),
          isSuccess: status.isSuccess,
          result: status.rawStatus
        },
        message: `Finance Data Management execution **${input.executionId}** is **${status.status}**.`
      };
    }

    let result = await client.getExportedPackageUrl({ executionId: input.executionId ?? '' });

    return {
      output: {
        action: input.action,
        executionId: input.executionId,
        url: stringResult(result),
        result
      },
      message: `Retrieved Finance Data Management ${input.action.replace(/_/g, ' ')} result.`
    };
  })
  .build();
