import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  companyId: z.string().describe('Company ID'),
  name: z.string().optional().describe('Company name'),
  country: z.string().optional(),
  timezone: z.string().optional(),
  domain: z.string().optional()
});

export let getCompanyTool = SlateTool.create(spec, {
  name: 'Get Company Info',
  key: 'get_company',
  description: `Retrieve information about your Dialpad company, including native company ID, name, country and domain when available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'get_company');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
