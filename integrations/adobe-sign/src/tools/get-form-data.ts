import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormData = SlateTool.create(spec, {
  name: 'Get Agreement Form Data',
  key: 'get_form_data',
  description: `Retrieve form field data from a completed or in-progress agreement. Returns the values that participants have entered into form fields, useful for extracting data from signed documents.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to retrieve form data from')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement'),
      formData: z
        .any()
        .describe('Form field data as CSV or structured content from the agreement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.getAgreementFormData(ctx.input.agreementId);

    return {
      output: {
        agreementId: ctx.input.agreementId,
        formData: result
      },
      message: `Retrieved form data for agreement \`${ctx.input.agreementId}\`.`
    };
  });
