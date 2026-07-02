import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateTemplate = SlateTool.create(spec, {
  name: 'Duplicate Google Doc Template',
  key: 'duplicate_template',
  description: `Creates a copy of the Google Doc template associated with a DocsAutomator automation. Returns the new template's Google Doc URL and ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z
        .string()
        .describe('The automation ID whose Google Doc template should be duplicated.')
    })
  )
  .output(
    z.object({
      newTemplateId: z.string().describe('Google Doc ID of the new template copy.'),
      templateUrl: z.string().describe('URL of the new Google Doc template copy.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.duplicateGoogleDocTemplate(ctx.input.automationId);

    return {
      output: {
        newTemplateId: result.newTemplateId,
        templateUrl: result.url
      },
      message: `Duplicated template. [Open new template](${result.url})`
    };
  })
  .build();
