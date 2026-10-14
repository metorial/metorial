import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DsmClient } from '../lib/client';
import { spec } from '../spec';

export let getDesignTokenStyles = SlateTool.create(spec, {
  name: 'Get Design Token Styles',
  key: 'get_design_token_styles',
  description: `Prepares a downloadable design token stylesheet from an InVision DSM design system in a specific format (CSS, SCSS, Less, YAML, XML, or JSON).
Useful for consuming tokens in platform-specific formats without additional transformation.

**Note:** InVision discontinued its design products on December 31, 2024. Legacy API availability is not guaranteed.`,
  instructions: [
    'Provide the full DSM export base URL from the InVision DSM API setup page.',
    'Choose the output format that matches your target platform.'
  ],
  tags: {
    readOnly: true
  }
})
  .authMethods(['dsm_api_key'])
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
      format: z.string().describe('The format of the downloadable style file'),
      filename: z.string().optional().describe('Name of the downloadable style file'),
      mimeType: z.string().optional().describe('MIME type of the downloadable style file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DsmClient({
      token: ctx.auth.token,
      dsmBaseUrl: ctx.input.dsmExportBaseUrl
    });

    let providerStyles = await client.getStyleParams(ctx.input.format);
    let styleContent: string | undefined;
    try {
      styleContent =
        typeof providerStyles === 'string' ? providerStyles : JSON.stringify(providerStyles);
    } catch (error) {
      throw createApiServiceError(
        'InVision returned style content that could not be serialized.',
        {
          parent: error
        }
      );
    }
    if (styleContent === undefined) {
      throw createApiServiceError('InVision did not return design token style content.');
    }

    let mimeTypes = {
      css: 'text/css',
      scss: 'text/x-scss',
      less: 'text/plain',
      styl: 'text/plain',
      xml: 'application/xml',
      yaml: 'application/yaml',
      json: 'application/json'
    };
    let filename = `design-token-styles.${ctx.input.format}`;
    let mimeType = mimeTypes[ctx.input.format];
    await ctx.addAttachment({
      type: 'url',
      url: client.getStyleParamsUrl(ctx.input.format),
      headers: { 'X-API-KEY': ctx.auth.token },
      filename,
      mimeType
    });

    return {
      output: {
        styleContent,
        format: ctx.input.format,
        filename,
        mimeType
      },
      message: `Retrieved design token styles in **${ctx.input.format}** format and prepared the file for download.`
    };
  })
  .build();
