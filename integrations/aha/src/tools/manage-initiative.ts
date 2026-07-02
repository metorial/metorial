import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

let initiativeOutputSchema = z.object({
  initiativeId: z.string().optional().describe('Initiative ID'),
  referenceNum: z.string().optional().describe('Initiative reference number'),
  name: z.string().optional().describe('Initiative name'),
  description: z.string().optional().describe('Initiative description'),
  status: z.string().optional().describe('Workflow status name'),
  progress: z.number().optional().describe('Progress percentage'),
  url: z.string().optional().describe('Aha! URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  deleted: z.boolean().optional().describe('True if the initiative was deleted')
});

export let manageInitiative = SlateTool.create(spec, {
  name: 'Manage Initiative',
  key: 'manage_initiative',
  description: `Create, update, or delete a strategic initiative in Aha!. Initiatives link strategy to execution by connecting goals to releases, epics, and features.`,
  instructions: [
    'To **create** an initiative, set action to "create" and provide a productId plus at least a name.',
    'To **update** an initiative, set action to "update" and provide the initiativeId plus the fields to change.',
    'To **delete** an initiative, set action to "delete" and provide the initiativeId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      initiativeId: z
        .string()
        .optional()
        .describe('Initiative ID or reference number (required for update/delete)'),
      productId: z
        .string()
        .optional()
        .describe('Product ID or reference prefix (required for create)'),
      name: z.string().optional().describe('Initiative name'),
      description: z.string().optional().describe('Initiative description (HTML supported)')
    })
  )
  .output(initiativeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.productId)
        throw new Error('productId is required to create an initiative');
      if (!ctx.input.name) throw new Error('name is required to create an initiative');

      let initiative = await client.createInitiative(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description
      });

      return {
        output: {
          initiativeId: initiative.id,
          referenceNum: initiative.reference_num,
          name: initiative.name,
          description: initiative.description,
          status: initiative.workflow_status?.name,
          progress: initiative.progress,
          url: initiative.url,
          createdAt: initiative.created_at,
          updatedAt: initiative.updated_at
        },
        message: `Created initiative **${initiative.reference_num}** — ${initiative.name}.`
      };
    }

    if (!ctx.input.initiativeId) throw new Error('initiativeId is required for this action');

    if (action === 'delete') {
      await client.deleteInitiative(ctx.input.initiativeId);
      return {
        output: { initiativeId: ctx.input.initiativeId, deleted: true },
        message: `Deleted initiative \`${ctx.input.initiativeId}\`.`
      };
    }

    // update
    let initiative = await client.updateInitiative(ctx.input.initiativeId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        initiativeId: initiative.id,
        referenceNum: initiative.reference_num,
        name: initiative.name,
        description: initiative.description,
        status: initiative.workflow_status?.name,
        progress: initiative.progress,
        url: initiative.url,
        createdAt: initiative.created_at,
        updatedAt: initiative.updated_at
      },
      message: `Updated initiative **${initiative.reference_num}** — ${initiative.name}.`
    };
  })
  .build();
