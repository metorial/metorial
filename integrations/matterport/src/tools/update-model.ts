import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateModel = SlateTool.create(spec, {
  name: 'Update Model',
  key: 'update_model',
  description: `Update a Matterport model's details, visibility, and activation state. Combines detail patching (name, description, publication, MLS), visibility toggling (public/private/unlisted), and activation state changes (active/inactive) into a single tool.`,
  instructions: [
    'To change visibility, models must be in an active state first.',
    'Purchasing assets like floorplans requires the model to be public or unlisted.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      name: z.string().optional().describe('New name for the model'),
      description: z.string().optional().describe('New description for the model'),
      visibility: z
        .enum(['private', 'public', 'unlisted'])
        .optional()
        .describe('New visibility setting'),
      activationState: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('New activation state'),
      publication: z
        .object({
          summary: z.string().optional(),
          externalUrl: z.string().optional(),
          presentedBy: z.string().optional(),
          contact: z
            .object({
              name: z.string().optional(),
              email: z.string().optional(),
              phoneNumber: z.string().optional()
            })
            .optional()
        })
        .optional()
        .describe('Publication details to update'),
      mls: z
        .object({
          mlsId: z.string().optional().describe('MLS listing ID'),
          mlsName: z.string().optional().describe('MLS listing name')
        })
        .optional()
        .describe('MLS listing information')
    })
  )
  .output(
    z.object({
      modelId: z.string().describe('ID of the updated model'),
      name: z.string().nullable().optional().describe('Updated model name'),
      description: z.string().nullable().optional().describe('Updated description'),
      visibility: z.string().nullable().optional().describe('Updated visibility'),
      state: z.string().nullable().optional().describe('Updated activation state'),
      publication: z.any().nullable().optional().describe('Updated publication info'),
      mls: z.any().nullable().optional().describe('Updated MLS info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result: Record<string, any> = { modelId: ctx.input.modelId };
    let actions: string[] = [];

    // Handle activation state change first (must be done before visibility)
    if (ctx.input.activationState) {
      let stateResult = await client.updateModelState(
        ctx.input.modelId,
        ctx.input.activationState
      );
      result.state = stateResult.state;
      actions.push(`activation state set to **${ctx.input.activationState}**`);
    }

    // Handle visibility change
    if (ctx.input.visibility) {
      let visResult = await client.updateModelVisibility(
        ctx.input.modelId,
        ctx.input.visibility
      );
      result.visibility = visResult.accessVisibility;
      actions.push(`visibility set to **${ctx.input.visibility}**`);
    }

    // Handle details patch
    let patch: Record<string, any> = {};
    if (ctx.input.name !== undefined) patch.name = ctx.input.name;
    if (ctx.input.description !== undefined) patch.description = ctx.input.description;
    if (ctx.input.publication) patch.publication = ctx.input.publication;
    if (ctx.input.mls) {
      patch.mls = {
        id: ctx.input.mls.mlsId,
        name: ctx.input.mls.mlsName
      };
    }

    if (Object.keys(patch).length > 0) {
      let patchResult = await client.updateModelDetails(ctx.input.modelId, patch);
      result.name = patchResult.name;
      result.description = patchResult.description;
      result.publication = patchResult.publication;
      result.mls = patchResult.mls;
      actions.push('details updated');
    }

    return {
      output: result as any,
      message: `Model **${ctx.input.modelId}** updated: ${actions.join(', ') || 'no changes applied'}.`
    };
  })
  .build();
