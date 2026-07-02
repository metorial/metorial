import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSkillsetTool = SlateTool.create(spec, {
  name: 'Manage Skillset',
  key: 'manage_skillset',
  description: `Create, update, delete, or fetch skillsets and their abilities. Skillsets define what actions AI agents can perform. Abilities are individual actions within a skillset, defined through natural language instructions.`,
  instructions: [
    'To manage abilities within a skillset, use the abilityAction field with a skillsetId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fetch'])
        .describe('Action on the skillset'),
      skillsetId: z
        .string()
        .optional()
        .describe('Skillset ID (required for update, delete, fetch, and ability actions)'),
      name: z.string().optional().describe('Skillset or ability name'),
      description: z.string().optional().describe('Skillset or ability description'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata'),
      abilityAction: z
        .enum(['create', 'update', 'delete', 'list'])
        .optional()
        .describe('Action on an ability within the skillset'),
      abilityId: z.string().optional().describe('Ability ID (for ability update/delete)'),
      instruction: z
        .string()
        .optional()
        .describe('Natural language instruction for the ability')
    })
  )
  .output(
    z.object({
      skillsetId: z.string().optional().describe('Skillset ID'),
      name: z.string().optional().describe('Name'),
      description: z.string().optional().describe('Description'),
      abilityId: z.string().optional().describe('Ability ID (for ability actions)'),
      abilities: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of abilities'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let {
      action,
      skillsetId,
      name,
      description,
      meta,
      abilityAction,
      abilityId,
      instruction
    } = ctx.input;

    // Ability-level actions
    if (abilityAction && skillsetId) {
      if (abilityAction === 'create') {
        let result = await client.createAbility(skillsetId, {
          name,
          description,
          instruction,
          meta
        });
        return {
          output: {
            skillsetId,
            abilityId: result.id,
            name: result.name,
            description: result.description
          },
          message: `Ability **${result.name || result.id}** created in skillset **${skillsetId}**.`
        };
      }
      if (abilityAction === 'update') {
        if (!abilityId) throw new Error('abilityId is required to update an ability');
        let updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (instruction !== undefined) updateData.instruction = instruction;
        if (meta !== undefined) updateData.meta = meta;
        await client.updateAbility(skillsetId, abilityId, updateData);
        return {
          output: { skillsetId, abilityId },
          message: `Ability **${abilityId}** updated in skillset **${skillsetId}**.`
        };
      }
      if (abilityAction === 'delete') {
        if (!abilityId) throw new Error('abilityId is required to delete an ability');
        await client.deleteAbility(skillsetId, abilityId);
        return {
          output: { skillsetId, abilityId },
          message: `Ability **${abilityId}** deleted from skillset **${skillsetId}**.`
        };
      }
      if (abilityAction === 'list') {
        let result = await client.listAbilities(skillsetId);
        return {
          output: { skillsetId, abilities: result.items },
          message: `Found **${result.items.length}** abilities in skillset **${skillsetId}**.`
        };
      }
    }

    // Skillset-level actions
    if (action === 'create') {
      let result = await client.createSkillset({ name, description, meta });
      return {
        output: {
          skillsetId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Skillset **${result.name || result.id}** created.`
      };
    }

    if (action === 'fetch') {
      if (!skillsetId) throw new Error('skillsetId is required for fetch');
      let result = await client.fetchSkillset(skillsetId);
      return {
        output: {
          skillsetId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Fetched skillset **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!skillsetId) throw new Error('skillsetId is required for update');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (meta !== undefined) updateData.meta = meta;
      await client.updateSkillset(skillsetId, updateData);
      return {
        output: { skillsetId, name, description },
        message: `Skillset **${skillsetId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!skillsetId) throw new Error('skillsetId is required for delete');
      await client.deleteSkillset(skillsetId);
      return {
        output: { skillsetId },
        message: `Skillset **${skillsetId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
