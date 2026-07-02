import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateAudit = SlateTool.create(spec, {
  name: 'Generate Security Audit',
  key: 'generate_audit',
  description: `Generate a security audit report for your n8n instance. The report covers risk categories including credentials, database, nodes, filesystem, and instance-level risks. Optionally configure which categories to include and the threshold for abandoned workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categories: z
        .array(z.string())
        .optional()
        .describe(
          'Risk categories to include in the audit (e.g. "credentials", "database", "nodes", "filesystem", "instance")'
        ),
      daysAbandonedWorkflow: z
        .number()
        .optional()
        .describe('Number of days after which a workflow is considered abandoned')
    })
  )
  .output(
    z.object({
      auditReport: z
        .any()
        .describe('Security audit report with risk assessments across configured categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let options: any = {};
    if (ctx.input.categories || ctx.input.daysAbandonedWorkflow !== undefined) {
      options.additionalOptions = {};
      if (ctx.input.categories) options.additionalOptions.categories = ctx.input.categories;
      if (ctx.input.daysAbandonedWorkflow !== undefined)
        options.additionalOptions.daysAbandonedWorkflow = ctx.input.daysAbandonedWorkflow;
    }

    let report = await client.generateAudit(options);

    return {
      output: {
        auditReport: report
      },
      message: `Generated security audit report for your n8n instance.`
    };
  })
  .build();
