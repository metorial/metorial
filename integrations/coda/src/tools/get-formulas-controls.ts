import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormulasControlsTool = SlateTool.create(spec, {
  name: 'Get Formulas and Controls',
  key: 'get_formulas_controls',
  description: `List named formulas and interactive controls (sliders, checkboxes, select boxes, etc.) from a Coda doc. Use get_formula or get_control for current computed values.`,
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
            parentPageId: z.string().optional().describe('ID of the parent page')
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
            parentPageId: z.string().optional().describe('ID of the parent page')
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
        parentPageId: f.parent?.id
      }));
    }

    if (ctx.input.includeControls) {
      let controlResult = await client.listControls(ctx.input.docId);
      controls = (controlResult.items || []).map((c: any) => ({
        controlId: c.id,
        name: c.name,
        controlType: c.controlType,
        parentPageId: c.parent?.id
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

export let getFormulaTool = SlateTool.create(spec, {
  name: 'Get Formula',
  key: 'get_formula',
  description: `Retrieve a Coda formula and its current computed value.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      formulaIdOrName: z.string().describe('ID or name of the formula to retrieve')
    })
  )
  .output(
    z.object({
      formulaId: z.string().describe('ID of the formula'),
      name: z.string().describe('Name of the formula'),
      value: z.any().optional().describe('Current computed value of the formula'),
      parentPageId: z.string().optional().describe('ID of the parent page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let formula = await client.getFormula(ctx.input.docId, ctx.input.formulaIdOrName);

    return {
      output: {
        formulaId: formula.id,
        name: formula.name,
        value: formula.value,
        parentPageId: formula.parent?.id
      },
      message: `Retrieved formula **${formula.name}** (${formula.id}).`
    };
  })
  .build();

export let getControlTool = SlateTool.create(spec, {
  name: 'Get Control',
  key: 'get_control',
  description: `Retrieve a Coda control and its current value.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      controlIdOrName: z.string().describe('ID or name of the control to retrieve')
    })
  )
  .output(
    z.object({
      controlId: z.string().describe('ID of the control'),
      name: z.string().describe('Name of the control'),
      controlType: z.string().optional().describe('Type of control'),
      value: z.any().optional().describe('Current value of the control'),
      parentPageId: z.string().optional().describe('ID of the parent page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let control = await client.getControl(ctx.input.docId, ctx.input.controlIdOrName);

    return {
      output: {
        controlId: control.id,
        name: control.name,
        controlType: control.controlType,
        value: control.value,
        parentPageId: control.parent?.id
      },
      message: `Retrieved control **${control.name}** (${control.id}).`
    };
  })
  .build();
