import { SlateTool } from 'slates';
import { z } from 'zod';
import { DsmClient } from '../lib/client';
import { spec } from '../spec';

export let getDesignTokens = SlateTool.create(spec, {
  name: 'Get Design Tokens',
  key: 'get_design_tokens',
  description: `Retrieves design tokens (colors, typography, spacing, etc.) from an InVision DSM design system.
Returns token data in JSON format, useful for integrating design system values into development workflows.
Supports both **lookup** (key-value) and **list** export formats.

**Note:** InVision was shut down on December 31, 2024. This tool will only work if the service is still accessible.`,
  instructions: [
    'Provide the full DSM export base URL from the InVision DSM API setup page.',
    'The DSM API key must be configured via the DSM API Key authentication method.'
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
      exportFormat: z
        .enum(['lookup', 'list'])
        .default('lookup')
        .describe('JSON export format: "lookup" for key-value pairs, "list" for array format')
    })
  )
  .output(
    z.object({
      tokens: z.any().describe('The design token data returned from the DSM API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DsmClient({
      token: ctx.auth.token,
      dsmBaseUrl: ctx.input.dsmExportBaseUrl
    });

    let tokens = await client.getDesignTokens('json', ctx.input.exportFormat);

    return {
      output: {
        tokens
      },
      message: `Successfully retrieved design tokens in **${ctx.input.exportFormat}** format from the DSM design system.`
    };
  })
  .build();
