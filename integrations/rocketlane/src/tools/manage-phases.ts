import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPhase = SlateTool.create(spec, {
  name: 'Create Phase',
  key: 'create_phase',
  description: `Creates a new phase within a Rocketlane project. Phases break projects into distinct stages with their own start and due dates. Phases can be private or shared with customers.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phaseName: z.string().describe('Name of the phase'),
      projectId: z.number().describe('ID of the project this phase belongs to'),
      startDate: z.string().describe('Phase start date in YYYY-MM-DD format'),
      dueDate: z.string().describe('Phase due date in YYYY-MM-DD format'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether this phase is private (not visible to customers)')
    })
  )
  .output(
    z.object({
      phaseId: z.number().describe('Unique ID of the created phase'),
      phaseName: z.string().describe('Phase name'),
      startDate: z.string().optional().describe('Start date'),
      dueDate: z.string().optional().describe('Due date'),
      status: z.any().optional().describe('Phase status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createPhase({
      phaseName: ctx.input.phaseName,
      projectId: ctx.input.projectId,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      private: ctx.input.isPrivate
    });

    return {
      output: result,
      message: `Phase **${result.phaseName}** created successfully (ID: ${result.phaseId}).`
    };
  })
  .build();

export let updatePhase = SlateTool.create(spec, {
  name: 'Update Phase',
  key: 'update_phase',
  description: `Updates an existing phase in a Rocketlane project. Supports updating the name, dates, and privacy settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phaseId: z.number().describe('ID of the phase to update'),
      phaseName: z.string().optional().describe('New phase name'),
      startDate: z.string().optional().describe('New start date in YYYY-MM-DD format'),
      dueDate: z.string().optional().describe('New due date in YYYY-MM-DD format'),
      isPrivate: z.boolean().optional().describe('Whether this phase is private')
    })
  )
  .output(
    z.object({
      phaseId: z.number().describe('ID of the updated phase'),
      phaseName: z.string().optional().describe('Updated phase name'),
      startDate: z.string().optional().describe('Updated start date'),
      dueDate: z.string().optional().describe('Updated due date'),
      status: z.any().optional().describe('Phase status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updatePhase(ctx.input.phaseId, {
      phaseName: ctx.input.phaseName,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      private: ctx.input.isPrivate
    });

    return {
      output: result,
      message: `Phase **${result.phaseName || ctx.input.phaseId}** updated successfully.`
    };
  })
  .build();

export let listPhases = SlateTool.create(spec, {
  name: 'List Phases',
  key: 'list_phases',
  description: `Lists phases within a Rocketlane project with pagination support. Returns phase details including name, dates, status, and privacy settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter phases by project ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of phases to return')
    })
  )
  .output(
    z.object({
      phases: z
        .array(
          z.object({
            phaseId: z.number().describe('Phase ID'),
            phaseName: z.string().describe('Phase name'),
            startDate: z.string().nullable().optional().describe('Start date'),
            dueDate: z.string().nullable().optional().describe('Due date'),
            status: z.any().optional().describe('Phase status')
          })
        )
        .describe('List of phases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPhases({
      projectId: ctx.input.projectId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let phases = Array.isArray(result) ? result : (result.phases ?? result.data ?? []);

    return {
      output: { phases },
      message: `Found **${phases.length}** phase(s).`
    };
  })
  .build();

export let deletePhase = SlateTool.create(spec, {
  name: 'Delete Phase',
  key: 'delete_phase',
  description: `Permanently deletes a phase from a Rocketlane project. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      phaseId: z.number().describe('ID of the phase to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePhase(ctx.input.phaseId);

    return {
      output: { success: true },
      message: `Phase ${ctx.input.phaseId} has been **deleted**.`
    };
  })
  .build();
