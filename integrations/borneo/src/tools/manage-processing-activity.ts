import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { attachDownload, listMetadata, readList, redact } from '../lib/responses';
import { spec } from '../spec';

export let manageProcessingActivity = SlateTool.create(spec, {
  name: 'Manage Processing Activity',
  key: 'manage_processing_activity',
  description: `Create, retrieve, update, list, delete, or export processing activities. Processing activities define data processing workflows with compliance attributes for GDPR and other regulations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete', 'export'])
        .describe('Action to perform'),
      activityId: z
        .string()
        .optional()
        .describe('Processing activity ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Processing activity name; required for create and update'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the activity is active; required for create and update'),
      description: z.string().optional().describe('Activity description'),
      retentionPolicy: z.string().optional().describe('Data retention policy'),
      language: z.string().optional().describe('Export language (e.g. "en", "de", "fr")'),
      exportTypes: z
        .array(z.enum(['CSV', 'PDF', 'DOC']))
        .optional()
        .describe('Export formats'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        activity: z.any().optional().describe('Processing activity record'),
        activities: z.array(z.any()).optional().describe('List of processing activities'),
        exportResult: z.any().optional().describe('Export result data'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, activityId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || ctx.input.active === undefined) {
          throw createApiServiceError(
            'name and active are required for creating a processing activity'
          );
        }
        let result = await client.createProcessingActivity({
          name: ctx.input.name,
          active: ctx.input.active,
          description: ctx.input.description,
          retentionPolicy: ctx.input.retentionPolicy
        });
        let data = result;
        return {
          output: { activity: data, success: true },
          message: `Processing activity **${ctx.input.name}** created.`
        };
      }
      case 'get': {
        if (!activityId) throw createApiServiceError('activityId is required for get action');
        let result = await client.getProcessingActivity(activityId);
        let data = result;
        return {
          output: { activity: data, success: true },
          message: `Retrieved processing activity **${activityId}**.`
        };
      }
      case 'list': {
        let result = await client.listProcessingActivities({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let activities = readList(data, 'processingActivities');
        return {
          output: { activities, success: true, ...listMetadata(data) },
          message: `Found **${activities.length}** processing activity/ies.`
        };
      }
      case 'update': {
        if (!activityId)
          throw createApiServiceError('activityId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.active !== undefined) updatePayload.active = ctx.input.active;
        if (ctx.input.description !== undefined)
          updatePayload.description = ctx.input.description;
        if (ctx.input.retentionPolicy !== undefined)
          updatePayload.retentionPolicy = ctx.input.retentionPolicy;

        let result = await client.updateProcessingActivity(activityId, updatePayload);
        let data = result;
        return {
          output: { activity: data, success: true },
          message: `Processing activity **${activityId}** updated.`
        };
      }
      case 'delete': {
        if (!activityId)
          throw createApiServiceError('activityId is required for delete action');
        await client.deleteProcessingActivity(activityId);
        return {
          output: { success: true },
          message: `Processing activity **${activityId}** deleted.`
        };
      }
      case 'export': {
        if (!ctx.input.language || !ctx.input.exportTypes?.length) {
          throw createApiServiceError(
            'language and exportTypes are required for export action'
          );
        }
        let result = await client.exportProcessingActivities({
          language: ctx.input.language,
          exportTypes: ctx.input.exportTypes
        });
        if (!Array.isArray(result.urlList) || !result.urlList.length)
          throw createApiServiceError('Borneo did not return any export download URLs.');
        for (let file of result.urlList) {
          await attachDownload(
            value => ctx.addAttachment(value),
            file?.url,
            ctx.auth.token,
            ctx.auth.baseUrl ?? ctx.config.baseUrl
          );
        }
        let data = redact(result, ctx.auth.token);
        return {
          output: { exportResult: data, success: true },
          message: `Processing activities exported in **${ctx.input.exportTypes.join(', ')}** format(s).`
        };
      }
    }
  })
  .build();
