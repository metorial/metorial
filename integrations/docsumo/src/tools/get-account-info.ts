import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentTypeSchema = z.object({
  docTypeId: z.string().describe('Unique ID or value for the document type'),
  title: z.string().describe('Human-readable document type name'),
  docType: z.string().describe('Document type identifier used in API calls')
});

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieve Docsumo account details, monthly document usage, and active document types. Use this as a first call to verify the API key and discover valid document type identifiers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Docsumo user ID'),
      email: z.string().describe('Account email address'),
      fullName: z.string().describe('Account full name'),
      monthlyDocCurrent: z.number().describe('Documents processed in the current cycle'),
      monthlyDocLimit: z.number().describe('Monthly document processing limit'),
      documentTypes: z.array(documentTypeSchema).describe('Active document types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccountInfo();

    return {
      output: account,
      message: `Docsumo account **${account.email}** has processed ${account.monthlyDocCurrent}/${account.monthlyDocLimit} monthly document(s).`
    };
  })
  .build();
