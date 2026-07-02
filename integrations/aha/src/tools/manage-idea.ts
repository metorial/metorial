import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let ideaOutputSchema = z.object({
  ideaId: z.string().optional().describe('Idea ID'),
  referenceNum: z.string().optional().describe('Idea reference number'),
  name: z.string().optional().describe('Idea name'),
  description: z.string().optional().describe('Idea description (HTML)'),
  status: z.string().optional().describe('Workflow status name'),
  numEndorsements: z.number().optional().describe('Number of endorsements/votes'),
  tags: z.array(z.string()).optional().describe('Tags'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the idea was deleted')
});

export let manageIdea = SlateTool.create(spec, {
  name: 'Manage Idea',
  key: 'manage_idea',
  description: `Create, update, or delete an idea in Aha!. Ideas represent customer feedback and feature requests. They can be tagged, categorized, and eventually promoted to features.`,
  instructions: [
    'To **create** an idea, set action to "create" and provide a productId plus at least a name.',
    'To **update** an idea, set action to "update" and provide the ideaId plus the fields to change.',
    'To **delete** an idea, set action to "delete" and provide the ideaId.',
    'Set **skipPortal** to true when creating to avoid submitting the idea to any portal.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      ideaId: z
        .string()
        .optional()
        .describe('Idea ID or reference number (required for update/delete)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID or reference prefix (required for create)'),
      name: z.string().optional().describe('Idea name/title'),
      description: z.string().optional().describe('Idea description (HTML supported)'),
      tags: z.array(z.string()).optional().describe('Tags to set'),
      workflowStatus: z.string().optional().describe('Workflow status name'),
      skipPortal: z
        .boolean()
        .optional()
        .describe('Skip submitting to idea portal (create only)')
    })
  )
  .output(ideaOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId) throw new Error('productId is required to create an idea');
      if (!ctx.input.name) throw new Error('name is required to create an idea');

      let idea = await client.createIdea(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description,
        tags: ctx.input.tags,
        workflowStatus: ctx.input.workflowStatus,
        skipPortal: ctx.input.skipPortal
      });

      return {
        output: {
          ideaId: idea.id,
          referenceNum: idea.reference_num,
          name: idea.name,
          description: idea.description,
          status: idea.workflow_status?.name,
          numEndorsements: idea.num_endorsements,
          tags: idea.tags,
          url: idea.url,
          createdAt: idea.created_at,
          updatedAt: idea.updated_at
        },
        message: `Created idea **${idea.reference_num}** — ${idea.name}.`
      };
    }

    if (!ctx.input.ideaId) throw new Error('ideaId is required for this action');

    if (action === 'delete') {
      await client.deleteIdea(ctx.input.ideaId);
      return {
        output: { ideaId: ctx.input.ideaId, deleted: true },
        message: `Deleted idea \`${ctx.input.ideaId}\`.`
      };
    }

    // update
    let idea = await client.updateIdea(ctx.input.ideaId, {
      name: ctx.input.name,
      description: ctx.input.description,
      tags: ctx.input.tags,
      workflowStatus: ctx.input.workflowStatus
    });

    return {
      output: {
        ideaId: idea.id,
        referenceNum: idea.reference_num,
        name: idea.name,
        description: idea.description,
        status: idea.workflow_status?.name,
        numEndorsements: idea.num_endorsements,
        tags: idea.tags,
        url: idea.url,
        createdAt: idea.created_at,
        updatedAt: idea.updated_at
      },
      message: `Updated idea **${idea.reference_num}** — ${idea.name}.`
    };
  })
  .build();
