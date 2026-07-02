import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeReport } from '../lib/helpers';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieve detailed information about a specific Mode report by its token. Returns the report's name, description, archived status, timestamps, and associated collection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportToken: z.string().describe('The unique token identifying the report')
    })
  )
  .output(
    z.object({
      reportToken: z.string().describe('Unique token of the report'),
      name: z.string().describe('Name of the report'),
      description: z.string().describe('Description of the report'),
      createdAt: z.string().describe('ISO 8601 timestamp when the report was created'),
      updatedAt: z.string().describe('ISO 8601 timestamp when the report was last updated'),
      archived: z.boolean().describe('Whether the report is archived'),
      spaceToken: z.string().describe('Token of the collection the report belongs to'),
      lastRunAt: z.string().describe('ISO 8601 timestamp of the last successful run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let raw = await client.getReport(ctx.input.reportToken);
    let report = normalizeReport(raw);

    return {
      output: report,
      message: `Retrieved report **${report.name}** (${report.reportToken}).`
    };
  })
  .build();
