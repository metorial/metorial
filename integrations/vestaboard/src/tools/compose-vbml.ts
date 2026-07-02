import { SlateTool } from 'slates';
import { z } from 'zod';
import { VbmlClient } from '../lib/vbml';
import { spec } from '../spec';

let componentSchema = z.object({
  template: z
    .string()
    .optional()
    .describe(
      'Text template to render. Supports character codes in {N} notation and dynamic props in {{propName}} notation. Lowercase is auto-uppercased. Use \\n for line breaks.'
    ),
  rawCharacters: z
    .array(z.array(z.number()))
    .optional()
    .describe('Raw character code array. Overrides template if both are provided.'),
  style: z
    .object({
      height: z.number().optional().describe('Height of this component in rows (1-6).'),
      width: z.number().optional().describe('Width of this component in columns (1-22).'),
      justify: z
        .enum(['left', 'right', 'center', 'justified'])
        .optional()
        .describe('Horizontal text alignment.'),
      align: z
        .enum(['top', 'bottom', 'center', 'justified'])
        .optional()
        .describe('Vertical text alignment.'),
      absolutePosition: z
        .object({
          x: z.number().describe('Column position (0-based).'),
          y: z.number().describe('Row position (0-based).')
        })
        .optional()
        .describe('Place component at an exact position on the board.')
    })
    .optional()
    .describe('Layout and alignment options for this component.')
});

export let composeVbml = SlateTool.create(spec, {
  name: 'Compose VBML',
  key: 'compose_vbml',
  description: `Compose a message using VBML (Vestaboard Markup Language) and get back a character code array ready to send. Supports multiple components with layout styling, dynamic props, and absolute positioning.

Use this to create precisely formatted messages with mixed alignment, multi-section layouts, or dynamic content. The resulting character array can be passed to the **Send Message** tool.

Does **not** require authentication — VBML is a public formatting service.`,
  instructions: [
    'Each component needs either a template string or rawCharacters array.',
    'Use {N} in templates for character codes (e.g. {63} for red, {65} for yellow).',
    'Use {{propName}} for dynamic values, and provide matching props.',
    'For Vestaboard Note, set top-level style to height:3, width:15.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      components: z
        .array(componentSchema)
        .min(1)
        .describe(
          'Array of components to compose. Each represents a section of the board with its own template and style.'
        ),
      props: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Dynamic prop values to inject into templates. Keys match {{propName}} placeholders.'
        ),
      style: z
        .object({
          height: z
            .number()
            .optional()
            .describe(
              'Total board height in rows. Default: 6 (Flagship). Use 3 for Vestaboard Note.'
            ),
          width: z
            .number()
            .optional()
            .describe(
              'Total board width in columns. Default: 22 (Flagship). Use 15 for Vestaboard Note.'
            )
        })
        .optional()
        .describe('Top-level style controlling the output board dimensions.')
    })
  )
  .output(
    z.object({
      characters: z
        .array(z.array(z.number()))
        .describe('2D character code array ready to send to a Vestaboard.')
    })
  )
  .handleInvocation(async ctx => {
    let vbml = new VbmlClient();
    let characters = await vbml.compose({
      components: ctx.input.components,
      props: ctx.input.props,
      style: ctx.input.style
    });

    let rows = characters.length;
    let cols = characters[0]?.length ?? 0;

    return {
      output: { characters },
      message: `Composed a ${rows}x${cols} character array from ${ctx.input.components.length} component(s).`
    };
  })
  .build();
