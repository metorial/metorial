import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormulasControlsTool = SlateTool.create(spec, {
  name: 'Get Formulas and Controls',
  key: 'get_formulas_controls',
  description: `Retrieve named formulas and interactive controls (sliders, checkboxes, select boxes, etc.) from a Coda doc, including their current computed values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      includeFormulas: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include named formulas'),
      includeControls: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include controls')
    })
  )
  .output(
    z.object({
      formulas: z
        .array(
          z.object({
            formulaId: z.string().describe('ID of the formula'),
            name: z.string().describe('Name of the formula'),
            value: z.any().optional().describe('Current computed value of the formula')
          })
        )
        .optional(),
      controls: z
        .array(
          z.object({
            controlId: z.string().describe('ID of the control'),
            name: z.string().describe('Name of the control'),
            controlType: z
              .string()
              .optional()
              .describe('Type of control (e.g. slider, checkbox)'),
            value: z.any().optional().describe('Current value of the control')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let formulas: any[] | undefined;
    let controls: any[] | undefined;

    if (ctx.input.includeFormulas) {
      let formulaResult = await client.listFormulas(ctx.input.docId);
      formulas = (formulaResult.items || []).map((f: any) => ({
        formulaId: f.id,
        name: f.name,
        value: f.value
      }));
    }

    if (ctx.input.includeControls) {
      let controlResult = await client.listControls(ctx.input.docId);
      controls = (controlResult.items || []).map((c: any) => ({
        controlId: c.id,
        name: c.name,
        controlType: c.controlType,
        value: c.value
      }));
    }

    let counts: string[] = [];
    if (formulas) counts.push(`**${formulas.length}** formula(s)`);
    if (controls) counts.push(`**${controls.length}** control(s)`);

    return {
      output: {
        formulas,
        controls
      },
      message: `Found ${counts.join(' and ')} in the doc.`
    };
  })
  .build();
