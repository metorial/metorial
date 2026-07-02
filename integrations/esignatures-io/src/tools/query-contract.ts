import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let signerOutputSchema = z.object({
  signerId: z.string().describe('Unique ID of the signer'),
  name: z.string().optional().describe('Name of the signer'),
  email: z.string().optional().describe('Email of the signer'),
  mobile: z.string().optional().describe('Mobile number of the signer'),
  companyName: z.string().optional().describe('Company name of the signer'),
  signPageUrl: z.string().optional().describe('URL for the signer to sign the contract'),
  signerFieldValues: z
    .record(z.string(), z.any())
    .optional()
    .describe('Values entered by the signer in form fields')
});

export let queryContract = SlateTool.create(spec, {
  name: 'Get Contract',
  key: 'query_contract',
  description: `Retrieves the full details of a contract including its status, signer information, signer-entered field values, and the signed PDF URL (available after all parties have signed).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contractId: z.string().describe('ID of the contract to retrieve')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('Unique ID of the contract'),
      status: z
        .string()
        .optional()
        .describe('Current status of the contract (e.g., sent, signed, withdrawn)'),
      title: z.string().optional().describe('Title of the contract'),
      metadata: z.string().optional().describe('Custom metadata'),
      source: z
        .string()
        .optional()
        .describe('How the contract was created (e.g., api, dashboard)'),
      test: z.string().optional().describe('Whether this is a test contract'),
      contractPdfUrl: z
        .string()
        .optional()
        .describe(
          'URL to download the signed PDF (available after all signers have signed, expires in 3 days)'
        ),
      labels: z.array(z.string()).optional().describe('Labels assigned to the contract'),
      signers: z.array(signerOutputSchema).optional().describe('Signers and their details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Fetching contract details...');

    let result = await client.queryContract(ctx.input.contractId);

    let contract = result?.data?.contract || result?.contract || result;

    let signers = (contract?.signers || []).map((s: any) => ({
      signerId: s.id,
      name: s.name,
      email: s.email,
      mobile: s.mobile,
      companyName: s.companyName,
      signPageUrl: s.signPageUrl,
      signerFieldValues: s.signerFieldValues
    }));

    let output = {
      contractId: contract?.id || ctx.input.contractId,
      status: contract?.status,
      title: contract?.title,
      metadata: contract?.metadata,
      source: contract?.source,
      test: contract?.test,
      contractPdfUrl: contract?.contractPdfUrl,
      labels: contract?.labels,
      signers
    };

    let statusText = output.status ? ` (status: ${output.status})` : '';

    return {
      output,
      message: `Contract **${output.title || output.contractId}**${statusText} with ${signers.length} signer(s).${output.contractPdfUrl ? ' Signed PDF is available.' : ''}`
    };
  })
  .build();
