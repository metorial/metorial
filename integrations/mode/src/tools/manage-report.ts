import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeReport } from '../lib/helpers';
import { spec } from '../spec';

export let manageReport = SlateTool.create(spec, {
  name: 'Manage Report',
  key: 'manage_report',
  description: `Update, archive, unarchive, or delete a Mode report.
Use **update** to change the report's name, description, or move it to a different collection.
Use **archive** or **unarchive** to soft-delete/restore a report.
Use **delete** to permanently remove a report.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['update', 'archive', 'unarchive', 'delete'])
        .describe('The action to perform on the report'),
      reportToken: z.string().describe('Token of the report to manage'),
      name: z.string().optional().describe('New name for the report (update only)'),
      description: z
        .string()
        .optional()
        .describe('New description for the report (update only)'),
      collectionToken: z
        .string()
        .optional()
        .describe('Token of the collection to move the report to (update only)')
    })
  )
  .output(
    z.object({
      reportToken: z.string().describe('Token of the managed report'),
      name: z.string().describe('Name of the report'),
      description: z.string().describe('Description of the report'),
      archived: z.boolean().describe('Whether the report is archived'),
      createdAt: z.string(),
      updatedAt: z.string(),
      spaceToken: z.string(),
      lastRunAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let { action, reportToken } = ctx.input;

    if (action === 'delete') {
      let existing = await client.getReport(reportToken);
      let report = normalizeReport(existing);
      await client.deleteReport(reportToken);
      return {
        output: report,
        message: `Permanently deleted report **${report.name}**.`
      };
    }

    if (action === 'archive') {
      let raw = await client.archiveReport(reportToken);
      let report = normalizeReport(raw);
      return {
        output: report,
        message: `Archived report **${report.name}**.`
      };
    }

    if (action === 'unarchive') {
      let raw = await client.unarchiveReport(reportToken);
      let report = normalizeReport(raw);
      return {
        output: report,
        message: `Unarchived report **${report.name}**.`
      };
    }

    // action === 'update'
    let raw = await client.updateReport(reportToken, {
      name: ctx.input.name,
      description: ctx.input.description,
      spaceToken: ctx.input.collectionToken
    });
    let report = normalizeReport(raw);
    return {
      output: report,
      message: `Updated report **${report.name}**.`
    };
  })
  .build();
