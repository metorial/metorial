import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/connection';
import { spec } from '../spec';

export const getWorkflow = SlateTool.create(spec, {
  name: 'Get Workflow',
  key: 'get_workflow',
  description:
    'Retrieve a current workflow definition or an exact historical version. Optionally provide a downloadable JSON copy. Historical snapshots do not assert current publication status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow ID from list_workflows'),
      versionId: z
        .string()
        .optional()
        .describe(
          'Exact native historical version ID. Requires supported workflow history and permissions; current and documented legacy read routes are supported.'
        ),
      download: z
        .boolean()
        .optional()
        .describe(
          'Also provide this native definition as a downloadable JSON file. Definitions can contain sensitive node parameters; share carefully.'
        )
    })
  )
  .output(
    z.object({
      workflowId: z.string(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      nodes: z.array(z.any()),
      connections: z.any(),
      settings: z.any().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      tags: z.array(z.any()).optional(),
      versionId: z.string().optional(),
      activeVersionId: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      nodeGroups: z.array(z.any()).optional(),
      downloaded: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const version =
      ctx.input.versionId !== undefined
        ? await client.getWorkflowVersion(ctx.input.workflowId, ctx.input.versionId)
        : undefined;
    const current = version ? undefined : await client.getWorkflow(ctx.input.workflowId);
    const native = version?.native ?? current!.native;
    let downloaded: boolean | undefined;
    if (ctx.input.download) {
      const content = JSON.stringify(native, null, 2);
      if (Buffer.byteLength(content) > 8 * 1024 * 1024)
        throw invalid(
          'The generated workflow JSON exceeds 8 MiB. Retrieve the definition without download or use your native instance export.'
        );
      await ctx.addAttachment({
        type: 'content',
        filename: `workflow-${ctx.input.workflowId}${version ? `-${version.versionId}` : ''}.json`,
        mimeType: 'application/json',
        content: new Response(content, { headers: { 'content-type': 'application/json' } })
      });
      downloaded = true;
    }
    return {
      output: {
        workflowId: version?.workflowId ?? current!.id,
        name: version?.name ?? current?.name,
        ...(current
          ? { active: current.active, settings: current.settings, tags: current.tags }
          : {}),
        nodes: version?.nodes ?? current!.nodes,
        connections: version?.connections ?? current!.connections,
        createdAt: version?.createdAt ?? current?.createdAt,
        updatedAt: version?.updatedAt ?? current?.updatedAt,
        versionId: typeof native.versionId === 'string' ? native.versionId : undefined,
        activeVersionId:
          typeof native.activeVersionId === 'string' || native.activeVersionId === null
            ? native.activeVersionId
            : undefined,
        description:
          typeof native.description === 'string' || native.description === null
            ? native.description
            : undefined,
        nodeGroups: Array.isArray(native.nodeGroups) ? native.nodeGroups : undefined,
        downloaded
      },
      message: version
        ? 'Retrieved the exact historical definition; current publication status is not part of that snapshot.'
        : 'Retrieved the native current workflow definition.'
    };
  })
  .build();
