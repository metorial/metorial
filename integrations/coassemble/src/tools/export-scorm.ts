import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportScorm = SlateTool.create(spec, {
  name: 'Export SCORM Package',
  key: 'export_scorm',
  description: `Export a Coassemble course as a SCORM package for use in third-party LMS platforms. Supports SCORM 1.2 and 2004, with dynamic or static package types.`,
  constraints: ['Requires Headless course creation access on your workspace.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('ID of the course to export'),
      version: z.enum(['1.2', '2004']).optional().describe('SCORM version'),
      packageType: z.enum(['dynamic', 'static']).optional().describe('SCORM package type')
    })
  )
  .output(
    z.object({
      scormExport: z
        .record(z.string(), z.any())
        .describe('SCORM export response (may contain download URL or package data)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.exportScorm(ctx.input.courseId, {
      version: ctx.input.version,
      type: ctx.input.packageType
    });

    return {
      output: { scormExport: result },
      message: `Exported course **${ctx.input.courseId}** as SCORM${ctx.input.version ? ` ${ctx.input.version}` : ''} package.`
    };
  })
  .build();
