import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let generateEmbedToken = SlateTool.create(spec, {
  name: 'Generate Embed Token',
  key: 'generate_embed_token',
  description: `Generate an embed token for embedding Power BI reports or dashboards in custom applications. Supports both report-level and dashboard-level embed tokens.`,
  instructions: [
    'Specify contentType "report" or "dashboard" and the corresponding resource ID.',
    'The generated token can be used with the Power BI JavaScript SDK to embed content.'
  ],
  constraints: [
    'Requires appropriate permissions on the target content.',
    'Embed tokens are short-lived and should be refreshed before expiration.'
  ]
})
  .input(
    z.object({
      contentType: z.enum(['report', 'dashboard']).describe('Type of content to embed'),
      contentId: z.string().describe('Report ID or Dashboard ID to embed'),
      workspaceId: z.string().optional().describe('Workspace ID containing the content'),
      accessLevel: z
        .enum(['View', 'Edit', 'Create'])
        .optional()
        .describe('Access level for the token (default: View)')
    })
  )
  .output(
    z.object({
      embedToken: z.string().describe('The generated embed token'),
      tokenId: z.string().optional().describe('Unique identifier for the token'),
      expiration: z.string().optional().describe('Token expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { contentType, contentId, workspaceId, accessLevel } = ctx.input;

    let body = { accessLevel: accessLevel || 'View' };
    let result: any;

    if (contentType === 'report') {
      result = await client.generateReportEmbedToken(contentId, body, workspaceId);
    } else {
      result = await client.generateDashboardEmbedToken(contentId, body, workspaceId);
    }

    return {
      output: {
        embedToken: result.token,
        tokenId: result.tokenId,
        expiration: result.expiration
      },
      message: `Generated embed token for ${contentType} **${contentId}**. Expires at ${result.expiration || 'unknown'}.`
    };
  })
  .build();
