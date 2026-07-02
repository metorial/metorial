import { SlateTool } from 'slates';
import { z } from 'zod';
import { DsmClient } from '../lib/client';
import { spec } from '../spec';

export let getDesignTokenStyles = SlateTool.create(spec, {
  name: 'Get Design Token Styles',
  key: 'get_design_token_styles',
  description: `Retrieves design tokens from an InVision DSM design system in a specific style format (CSS, SCSS, Less, YAML, XML, etc.).
Useful for directly consuming tokens in platform-specific formats without additional transformation.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  instructions: [
    'Provide the full DSM export base URL from the InVision DSM API setup page.',
    'Choose the output format that matches your target platform.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dsmExportBaseUrl: z
        .string()
        .describe(
          'The DSM export base URL (e.g., https://team.invisionapp.com/dsm-export/team-name/design-system-name)'
        ),
      format: z
        .enum(['css', 'scss', 'less', 'styl', 'xml', 'yaml', 'json'])
        .describe('The output format for the design token style parameters')
    })
  )
  .output(
    z.object({
      styleContent: z.string().describe('The style content in the requested format'),
      format: z.string().describe('The format of the returned style content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DsmClient({
      token: ctx.auth.token,
      dsmBaseUrl: ctx.input.dsmExportBaseUrl
    });

    let styleContent = await client.getStyleParams(ctx.input.format);

    return {
      output: {
        styleContent:
          typeof styleContent === 'string' ? styleContent : JSON.stringify(styleContent),
        format: ctx.input.format
      },
      message: `Successfully retrieved design token styles in **${ctx.input.format}** format.`
    };
  })
  .build();
