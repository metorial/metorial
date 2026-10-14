import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageInstructions = SlateTool.create(spec, {
  name: 'Manage Instructions',
  key: 'manage_instructions',
  description: `Create, list, update, or delete entity extraction instructions. Instructions define natural language prompts that Ragie automatically applies to documents to extract structured entities.
Once created, an instruction is applied to all new and updated documents.`,
  instructions: [
    'Use action "list" to see all existing instructions.',
    'Use action "create" with a unique name, a prompt describing what to extract, and an entitySchema (JSON Schema) for structured output.',
    'Use action "update" to modify an existing instruction.',
    'Use action "delete" to remove an instruction.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      instructionId: z
        .string()
        .optional()
        .describe('Instruction ID (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Unique instruction name (required for create, optional for update)'),
      prompt: z
        .string()
        .optional()
        .describe('Natural language extraction prompt (required for create)'),
      entitySchema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema defining extracted entities (required for create)'),
      active: z
        .boolean()
        .optional()
        .describe('Whether to run this instruction on new and updated documents'),
      contextTemplate: z
        .string()
        .optional()
        .describe('Mustache template to prepend document context during extraction'),
      partition: z
        .string()
        .optional()
        .describe(
          'Partition to scope a newly created instruction to; overrides the default partition'
        ),
      scope: z
        .enum(['chunk', 'document'])
        .optional()
        .describe('Extraction scope: "chunk" for granular, "document" for document-level'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata filter to scope which documents the instruction applies to')
    })
  )
  .output(
    z.object({
      instructions: z
        .array(
          z.object({
            instructionId: z.string().describe('Instruction ID'),
            name: z.string().describe('Instruction name'),
            prompt: z.string().describe('Extraction prompt'),
            entitySchema: z
              .record(z.string(), z.any())
              .nullable()
              .describe('Entity JSON Schema'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .optional()
        .describe('List of instructions (for list action)'),
      instruction: z
        .object({
          instructionId: z.string().describe('Instruction ID'),
          name: z.string().describe('Instruction name'),
          prompt: z.string().describe('Extraction prompt'),
          entitySchema: z
            .record(z.string(), z.any())
            .nullable()
            .describe('Entity JSON Schema'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          updatedAt: z.string().describe('ISO 8601 last update timestamp')
        })
        .optional()
        .describe('Created or updated instruction'),
      deleted: z.boolean().optional().describe('Whether the instruction was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let mapInstruction = (i: any) => ({
      instructionId: i.id,
      name: i.name,
      prompt: i.prompt,
      entitySchema: i.entitySchema,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt
    });

    switch (ctx.input.action) {
      case 'list': {
        let instructions = await client.listInstructions();
        return {
          output: {
            instructions: instructions.map(mapInstruction)
          },
          message: `Found **${instructions.length}** instructions.`
        };
      }

      case 'create': {
        if (!ctx.input.prompt) {
          throw createApiServiceError('Prompt is required for creating an instruction.');
        }
        if (!ctx.input.name || ctx.input.entitySchema === undefined) {
          throw createApiServiceError(
            'Creating an instruction requires a unique name and entitySchema.'
          );
        }
        let created = await client.createInstruction({
          name: ctx.input.name,
          prompt: ctx.input.prompt,
          entitySchema: ctx.input.entitySchema,
          scope: ctx.input.scope,
          filter: ctx.input.filter,
          active: ctx.input.active,
          contextTemplate: ctx.input.contextTemplate,
          partition: ctx.input.partition
        });
        return {
          output: {
            instruction: mapInstruction(created)
          },
          message: `Instruction **${created.name}** created. ID: \`${created.id}\``
        };
      }

      case 'update': {
        if (!ctx.input.instructionId) {
          throw createApiServiceError(
            'instructionId is required for updating an instruction.'
          );
        }
        if (
          [
            ctx.input.name,
            ctx.input.prompt,
            ctx.input.entitySchema,
            ctx.input.scope,
            ctx.input.filter,
            ctx.input.active,
            ctx.input.contextTemplate
          ].every(value => value === undefined)
        ) {
          throw createApiServiceError('Provide at least one instruction field to update.');
        }
        let updated = await client.updateInstruction(ctx.input.instructionId, {
          name: ctx.input.name,
          prompt: ctx.input.prompt,
          entitySchema: ctx.input.entitySchema,
          scope: ctx.input.scope,
          filter: ctx.input.filter,
          active: ctx.input.active,
          contextTemplate: ctx.input.contextTemplate
        });
        return {
          output: {
            instruction: mapInstruction(updated)
          },
          message: `Instruction \`${ctx.input.instructionId}\` updated.`
        };
      }

      case 'delete': {
        if (!ctx.input.instructionId) {
          throw createApiServiceError(
            'instructionId is required for deleting an instruction.'
          );
        }
        await client.deleteInstruction(ctx.input.instructionId);
        return {
          output: {
            deleted: true
          },
          message: `Instruction \`${ctx.input.instructionId}\` deleted.`
        };
      }
    }
  })
  .build();
