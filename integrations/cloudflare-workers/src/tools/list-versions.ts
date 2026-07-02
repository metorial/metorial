import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let versionSchema = z.object({
  versionId: z.string().describe('Version UUID'),
  number: z.number().optional().describe('Version number'),
  authorEmail: z.string().optional().describe('Email of the author who created this version'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  modifiedOn: z.string().optional().describe('ISO 8601 last modified timestamp'),
  source: z
    .string()
    .optional()
    .describe('Source that created this version (e.g. api, wrangler, dashboard)')
});

export let listVersions = SlateTool.create(spec, {
  name: 'List Worker Versions',
  key: 'list_versions',
  description: `List all versions of a Worker script. Optionally filter to only deployable versions. Versions are created separately from deployments—a version can exist without being deployed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      deployableOnly: z
        .boolean()
        .optional()
        .describe('When true, returns only versions that can be deployed')
    })
  )
  .output(
    z.object({
      versions: z.array(versionSchema).describe('List of versions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listVersions(ctx.input.scriptName, {
      deployable: ctx.input.deployableOnly
    });

    let items = result?.items || result || [];
    let mapped = items.map((v: any) => ({
      versionId: v.id,
      number: v.number,
      authorEmail: v.metadata?.author_email,
      createdOn: v.metadata?.created_on,
      modifiedOn: v.metadata?.modified_on,
      source: v.metadata?.source
    }));

    return {
      output: { versions: mapped },
      message: `Found **${mapped.length}** version(s) for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
