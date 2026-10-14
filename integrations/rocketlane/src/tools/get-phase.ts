import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPhase = SlateTool.create(spec, {
  name: 'Get Phase',
  key: 'get_phase',
  description:
    'Retrieves a project phase by its ID, including dates, status, privacy, and project details. Call list_phases to discover phase IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ phaseId: z.number().describe('Phase ID from list_phases') }))
  .output(
    z.object({
      phaseId: z.number().describe('Phase ID'),
      phaseName: z.string().describe('Phase name'),
      project: z
        .object({ projectId: z.number(), projectName: z.string().optional() })
        .nullable()
        .optional(),
      phaseDescription: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      status: z.any().optional(),
      private: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let phase = await new Client({ token: ctx.auth.token }).getPhase(ctx.input.phaseId);
    return {
      output: phase,
      message: `Retrieved phase **${phase.phaseName}** (ID: ${phase.phaseId}).`
    };
  })
  .build();
