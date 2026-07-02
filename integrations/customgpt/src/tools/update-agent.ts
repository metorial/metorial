import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let updateAgent = SlateTool.create(spec, {
  name: 'Update Agent',
  key: 'update_agent',
  description: `Update an existing AI agent's configuration. You can rename the agent, change its sitemap, toggle public sharing, and manage license settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent to update'),
      projectName: z.string().optional().describe('New name for the agent'),
      sitemapPath: z.string().optional().describe('New sitemap URL'),
      isShared: z.boolean().optional().describe('Whether the agent should be publicly shared'),
      isOcrEnabled: z.boolean().optional().describe('Enable OCR for documents'),
      areLicensesAllowed: z
        .boolean()
        .optional()
        .describe('Whether to allow licenses for this agent')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Agent ID'),
      projectName: z.string().describe('Updated agent name'),
      sitemapPath: z.string().nullable().describe('Sitemap URL'),
      isShared: z.boolean().describe('Whether the agent is publicly shared'),
      areLicensesAllowed: z.boolean().describe('Whether licenses are enabled'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let agent = await client.updateAgent(ctx.input.projectId, {
      projectName: ctx.input.projectName,
      sitemapPath: ctx.input.sitemapPath,
      isShared: ctx.input.isShared,
      isOcrEnabled: ctx.input.isOcrEnabled,
      areLicensesAllowed: ctx.input.areLicensesAllowed
    });

    return {
      output: {
        projectId: agent.projectId,
        projectName: agent.projectName,
        sitemapPath: agent.sitemapPath,
        isShared: agent.isShared,
        areLicensesAllowed: agent.areLicensesAllowed,
        updatedAt: agent.updatedAt
      },
      message: `Updated agent **${agent.projectName}** (ID: ${agent.projectId}).`
    };
  })
  .build();
