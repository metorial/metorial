import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let runFormula = SlateTool.create(spec, {
  name: 'Run Formula',
  key: 'run_formula',
  description: `Execute a formula on a Gigasheet sheet to create a new calculated column. Supports validating and previewing formulas before execution. Use the AI formula builder to help construct complex formulas from natural language.`,
  instructions: [
    'Set action to "validate" to check if a formula is valid before running it.',
    'Set action to "preview" to see sample results without applying the formula.',
    'Set action to "run" to execute the formula and create the calculated column.',
    'Set action to "ai_build" to use AI to generate a formula from a natural language prompt.'
  ]
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      action: z
        .enum(['run', 'validate', 'preview', 'ai_build'])
        .default('run')
        .describe('Formula action to perform'),
      formula: z
        .string()
        .optional()
        .describe('The formula expression to execute (for run, validate, preview)'),
      newColumnName: z
        .string()
        .optional()
        .describe('Name for the new formula column (for run action)'),
      prompt: z
        .string()
        .optional()
        .describe('Natural language description for AI formula builder (for ai_build action)')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.unknown()).describe('Formula operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown>;

    switch (ctx.input.action) {
      case 'run':
        if (!ctx.input.formula) throw new Error('formula is required for run');
        result = await client.runFormula(ctx.input.sheetHandle, {
          formula: ctx.input.formula,
          newColumnName: ctx.input.newColumnName
        });
        break;

      case 'validate':
        if (!ctx.input.formula) throw new Error('formula is required for validate');
        result = await client.validateFormula(ctx.input.sheetHandle, ctx.input.formula);
        break;

      case 'preview':
        if (!ctx.input.formula) throw new Error('formula is required for preview');
        result = await client.previewFormula(ctx.input.sheetHandle, ctx.input.formula);
        break;

      case 'ai_build':
        if (!ctx.input.prompt) throw new Error('prompt is required for ai_build');
        result = await client.formulaBuilder(ctx.input.sheetHandle, ctx.input.prompt);
        break;
    }

    return {
      output: { result },
      message: `Formula **${ctx.input.action}** completed successfully.`
    };
  })
  .build();
