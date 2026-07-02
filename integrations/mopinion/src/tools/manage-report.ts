import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let manageReport = SlateTool.create(spec, {
  name: 'Manage Report',
  key: 'manage_report',
  description: `Create, update, or delete a Mopinion report. Use the **action** field to specify the operation. For creating, provide a name. For updating, provide the report ID and fields to change. For deleting, provide the report ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the report'),
      reportId: z.number().optional().describe('Report ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Report name (required for create, optional for update)'),
      description: z.string().optional().describe('Report description'),
      language: z.string().optional().describe('Report language code (e.g., "en", "nl")')
    })
  )
  .output(
    z.object({
      reportId: z.number().optional().describe('ID of the affected report'),
      name: z.string().optional().describe('Report name'),
      success: z.boolean().describe('Whether the operation succeeded'),
      result: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    let { action, reportId, name, description, language } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a report');

      let result = await client.addReport({ name, description, language });
      let created = result.data || result;

      return {
        output: {
          reportId: created.id,
          name: created.name || name,
          success: true,
          result: created
        },
        message: `Created report **${name}**${created.id ? ` (ID: ${created.id})` : ''}.`
      };
    }

    if (action === 'update') {
      if (!reportId) throw new Error('reportId is required when updating a report');

      let updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (language !== undefined) updateData.language = language;

      let result = await client.updateReport(reportId, updateData);
      let updated = result.data || result;

      return {
        output: {
          reportId,
          name: updated.name || name,
          success: true,
          result: updated
        },
        message: `Updated report **${reportId}**.`
      };
    }

    if (action === 'delete') {
      if (!reportId) throw new Error('reportId is required when deleting a report');

      let result = await client.deleteReport(reportId);

      return {
        output: {
          reportId,
          success: true,
          result
        },
        message: `Deleted report **${reportId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
