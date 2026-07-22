import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  LookerClient,
  type LookerContentValidationError,
  type LookerContentValidatorError,
  type LookerProjectError
} from '../lib/client';
import { spec } from '../spec';

function mapContentError(error: LookerContentValidationError) {
  return {
    message: error.message ?? undefined,
    fieldName: error.field_name ?? undefined,
    modelName: error.model_name ?? undefined,
    exploreName: error.explore_name ?? undefined,
    removable: error.removable ?? undefined
  };
}

function mapProjectError(error: LookerProjectError) {
  let sanitizedMessage = error.sanitized_message ?? undefined;
  return {
    code: error.code ?? undefined,
    message: sanitizedMessage,
    sanitizedMessage,
    severity: error.severity ?? undefined,
    kind: error.kind ?? undefined,
    fieldName: error.field_name ?? undefined,
    filePath: error.file_path ?? undefined,
    lineNumber: error.line_number ?? undefined,
    modelId: error.model_id ?? undefined,
    exploreName: error.explore ?? undefined,
    helpUrl: error.help_url ?? undefined,
    params: error.params ?? undefined
  };
}

function mapContentItem(item: LookerContentValidatorError) {
  let contentType = 'unknown';
  let title: string | undefined;
  let contentId: string | undefined;
  let dashboardId: string | undefined;
  let lookId: string | undefined;
  let lookmlDashboardId: string | undefined;
  let lookmlLinkId: string | undefined;
  let spaceId: string | undefined;

  if (item.look) {
    contentType = 'look';
    title = item.look.title ?? undefined;
    contentId = item.look.id ?? undefined;
    lookId = item.look.id ?? undefined;
  } else if (item.dashboard) {
    contentType = 'dashboard';
    title = item.dashboard.title ?? undefined;
    contentId = item.dashboard.id ?? undefined;
    dashboardId = item.dashboard.id ?? undefined;
  } else if (item.dashboard_element) {
    contentType = 'dashboard_element';
    title = item.dashboard_element.title ?? undefined;
    contentId = item.dashboard_element.id ?? undefined;
    dashboardId = item.dashboard_element.dashboard_id ?? undefined;
    lookId = item.dashboard_element.look_id ?? undefined;
  } else if (item.dashboard_filter) {
    contentType = 'dashboard_filter';
    title = item.dashboard_filter.title ?? item.dashboard_filter.name ?? undefined;
    contentId = item.dashboard_filter.id ?? undefined;
    dashboardId = item.dashboard_filter.dashboard_id ?? undefined;
  } else if (item.scheduled_plan) {
    contentType = 'scheduled_plan';
    title = item.scheduled_plan.name ?? undefined;
    contentId = item.scheduled_plan.id ?? undefined;
    lookId = item.scheduled_plan.look_id ?? undefined;
  } else if (item.alert) {
    contentType = 'alert';
    title = item.alert.custom_title ?? undefined;
    contentId = item.alert.id ?? undefined;
    lookmlDashboardId = item.alert.lookml_dashboard_id ?? undefined;
    lookmlLinkId = item.alert.lookml_link_id ?? undefined;
  } else if (item.lookml_dashboard) {
    contentType = 'lookml_dashboard';
    title = item.lookml_dashboard.title ?? undefined;
    contentId = item.lookml_dashboard.id ?? undefined;
    lookmlDashboardId = item.lookml_dashboard.id ?? undefined;
    spaceId = item.lookml_dashboard.space_id ?? undefined;
  } else if (item.lookml_dashboard_element) {
    contentType = 'lookml_dashboard_element';
    title = item.lookml_dashboard_element.title ?? undefined;
    contentId = item.lookml_dashboard_element.lookml_link_id ?? undefined;
    lookmlLinkId = item.lookml_dashboard_element.lookml_link_id ?? undefined;
  }

  return {
    contentType,
    title,
    contentId,
    dashboardId,
    lookId,
    lookmlDashboardId,
    lookmlLinkId,
    spaceId,
    validationId: item.id ?? undefined,
    errors: (item.errors ?? []).map(mapContentError)
  };
}

export let validateContent = SlateTool.create(spec, {
  name: 'Validate Content',
  key: 'validate_content',
  description: `Run Looker's content validator across saved content, or lint all LookML files in one project. Content validation can be filtered by project names or space IDs. For backward compatibility, providing projectId without mode selects project validation; otherwise the default mode is content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z
        .enum(['content', 'project'])
        .optional()
        .describe('Validation mode; inferred from projectId when omitted'),
      projectId: z
        .string()
        .optional()
        .describe('LookML project ID; required for project mode'),
      projectNames: z
        .array(z.string())
        .optional()
        .describe('Project names to include in content validation'),
      spaceIds: z
        .array(z.string())
        .optional()
        .describe('Space IDs to include in content validation')
    })
  )
  .output(
    z.object({
      validationMode: z
        .enum(['content', 'project'])
        .optional()
        .describe('Validator that produced this result'),
      contentValid: z.boolean().describe('Whether all content is valid'),
      contentWithErrors: z
        .array(
          z.object({
            contentType: z
              .string()
              .optional()
              .describe('Type of content (look, dashboard, etc.)'),
            title: z.string().optional().describe('Content title'),
            contentId: z.string().optional().describe('Content ID'),
            dashboardId: z.string().optional().describe('Related dashboard ID'),
            lookId: z.string().optional().describe('Related Look ID'),
            lookmlDashboardId: z.string().optional().describe('Related LookML dashboard ID'),
            lookmlLinkId: z.string().optional().describe('Related LookML link ID'),
            spaceId: z.string().optional().describe('Related space ID'),
            validationId: z
              .string()
              .optional()
              .describe('ID unique to this content item for this validation run'),
            errors: z
              .array(
                z.object({
                  code: z
                    .string()
                    .optional()
                    .describe('Stable project error class identifier'),
                  message: z
                    .string()
                    .optional()
                    .describe(
                      'Provider error message; project-validation messages are sanitized'
                    ),
                  sanitizedMessage: z
                    .string()
                    .optional()
                    .describe('Error message with sensitive values removed'),
                  severity: z.string().optional().describe('Error severity'),
                  kind: z.string().optional().describe('Error kind'),
                  fieldName: z.string().optional().describe('Related field name'),
                  modelName: z.string().optional().describe('Related content model name'),
                  modelId: z.string().optional().describe('Related project model ID'),
                  exploreName: z.string().optional().describe('Related Explore name'),
                  removable: z
                    .boolean()
                    .optional()
                    .describe('Whether Looker can remove this content validation error'),
                  filePath: z.string().optional().describe('LookML file containing the error'),
                  lineNumber: z.number().optional().describe('Line containing the error'),
                  helpUrl: z
                    .string()
                    .optional()
                    .describe('Looker documentation for the error'),
                  params: z
                    .record(z.string(), z.unknown())
                    .optional()
                    .describe('Project error parameters')
                })
              )
              .optional()
              .describe('Validation errors')
          })
        )
        .optional()
        .describe('Content items with errors'),
      staleContent: z
        .array(
          z.object({
            contentType: z.string().optional().describe('Type of content'),
            title: z.string().optional().describe('Content title'),
            contentId: z.string().optional().describe('Content ID')
          })
        )
        .optional()
        .describe('Legacy field; current Looker API does not return stale-content data'),
      projectId: z.string().optional().describe('Validated LookML project ID'),
      projectDigest: z
        .string()
        .optional()
        .describe('Hash of the LookML project state that was validated'),
      modelsNotValidated: z
        .array(
          z.object({
            name: z.string().optional().describe('Model name'),
            projectFileId: z.string().optional().describe('Project file ID')
          })
        )
        .optional()
        .describe('Models Looker could not validate'),
      computationTime: z.number().optional().describe('Validation duration in seconds'),
      totalLooksValidated: z.number().optional().describe('Number of Looks validated'),
      totalDashboardsValidated: z
        .number()
        .optional()
        .describe('Legacy field; current Looker API does not return this count'),
      totalDashboardElementsValidated: z
        .number()
        .optional()
        .describe('Number of dashboard elements validated'),
      totalDashboardFiltersValidated: z
        .number()
        .optional()
        .describe('Number of dashboard filters validated'),
      totalScheduledPlansValidated: z
        .number()
        .optional()
        .describe('Number of scheduled plans validated'),
      totalAlertsValidated: z.number().optional().describe('Number of alerts validated'),
      totalExploresValidated: z.number().optional().describe('Number of Explores validated'),
      totalItemsWithErrors: z
        .number()
        .optional()
        .describe('Number of content items with validation errors'),
      totalErrors: z.number().optional().describe('Total number of validation errors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let mode = ctx.input.mode ?? (ctx.input.projectId !== undefined ? 'project' : 'content');

    if (mode === 'project') {
      if (ctx.input.projectId === undefined || ctx.input.projectId.length === 0) {
        throw createApiServiceError('projectId is required for project validation.', {
          reason: 'looker_project_validation_project_id_required'
        });
      }
      if (ctx.input.projectNames !== undefined || ctx.input.spaceIds !== undefined) {
        throw createApiServiceError(
          'projectNames and spaceIds apply only to content validation.',
          { reason: 'looker_project_validation_filters_unsupported' }
        );
      }

      let result = await client.lookmlValidation(ctx.input.projectId);
      let errors = result.errors ?? [];
      return {
        output: {
          validationMode: 'project' as const,
          contentValid: errors.length === 0,
          contentWithErrors: errors.map(error => ({
            contentType: 'lookml',
            title: error.file_path ?? undefined,
            errors: [mapProjectError(error)]
          })),
          projectId: ctx.input.projectId,
          projectDigest: result.project_digest ?? undefined,
          modelsNotValidated: (result.models_not_validated ?? []).map(model => ({
            name: model.name ?? undefined,
            projectFileId: model.project_file_id ?? undefined
          })),
          computationTime: result.computation_time ?? undefined,
          totalItemsWithErrors: errors.length,
          totalErrors: errors.length
        },
        message:
          errors.length === 0
            ? `LookML validation passed for project **${ctx.input.projectId}**.`
            : `Found **${errors.length}** LookML validation error(s) in project **${ctx.input.projectId}**.`
      };
    }

    if (ctx.input.projectId !== undefined) {
      throw createApiServiceError('projectId applies only to project validation.', {
        reason: 'looker_content_validation_project_id_unsupported'
      });
    }

    let result = await client.contentValidation({
      project_names: ctx.input.projectNames,
      space_ids: ctx.input.spaceIds
    });
    let contentErrors = result.content_with_errors ?? [];
    let totalErrors = contentErrors.reduce(
      (total, item) => total + (item.errors?.length ?? 0),
      0
    );

    return {
      output: {
        validationMode: 'content' as const,
        contentValid: contentErrors.length === 0,
        contentWithErrors: contentErrors.map(mapContentItem),
        computationTime: result.computation_time ?? undefined,
        totalLooksValidated: result.total_looks_validated ?? undefined,
        totalDashboardElementsValidated:
          result.total_dashboard_elements_validated ?? undefined,
        totalDashboardFiltersValidated: result.total_dashboard_filters_validated ?? undefined,
        totalScheduledPlansValidated: result.total_scheduled_plans_validated ?? undefined,
        totalAlertsValidated: result.total_alerts_validated ?? undefined,
        totalExploresValidated: result.total_explores_validated ?? undefined,
        totalItemsWithErrors: contentErrors.length,
        totalErrors
      },
      message:
        contentErrors.length === 0
          ? `Content validation passed. ${result.total_looks_validated ?? 0} Looks validated.`
          : `Found **${contentErrors.length}** content item(s) with errors.`
    };
  })
  .build();
