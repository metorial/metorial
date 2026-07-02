import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let signerSchema = z.object({
  signerId: z.string().optional().describe('Unique ID of the signer'),
  name: z.string().optional().describe('Name of the signer'),
  email: z.string().optional().describe('Email of the signer'),
  mobile: z.string().optional().describe('Mobile number of the signer'),
  companyName: z.string().optional().describe('Company name of the signer'),
  signingOrder: z.string().optional().describe('Signing order of the signer'),
  autoSign: z.string().optional().describe('Whether auto-sign is enabled'),
  redirectUrl: z.string().optional().describe('Redirect URL after signing'),
  signerFieldValues: z
    .record(z.string(), z.any())
    .optional()
    .describe('Values entered by the signer in form fields')
});

export let contractEvents = SlateTrigger.create(spec, {
  name: 'Contract Events',
  key: 'contract_events',
  description:
    'Triggered when a contract event occurs: sent to signer, reminder sent, all signers signed, withdrawn, or PDF preview generated. Configure the webhook URL in your eSignatures dashboard or per-contract.'
})
  .input(
    z.object({
      eventStatus: z.string().describe('The webhook event status type'),
      contractId: z.string().describe('ID of the contract'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the contract'),
      contractTitle: z.string().optional().describe('Title of the contract'),
      contractMetadata: z.string().optional().describe('Custom metadata of the contract'),
      contractSource: z
        .string()
        .optional()
        .describe('Source of the contract (api, dashboard, etc.)'),
      isTest: z.string().optional().describe('Whether this is a test contract'),
      contractPdfUrl: z
        .string()
        .optional()
        .describe(
          'URL to download the signed PDF (available on contract-signed, expires in 3 days)'
        ),
      signers: z.array(signerSchema).optional().describe('Signers on the contract'),
      sentToSigner: signerSchema
        .optional()
        .describe(
          'The specific signer the contract was sent/reminded to (for sent/reminder events)'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let status = body?.status || '';

      let contractStatuses = [
        'contract-sent-to-signer',
        'contract-reminder-sent-to-signer',
        'contract-signed',
        'contract-withdrawn',
        'contract-pdf-generated'
      ];

      if (!contractStatuses.includes(status)) {
        return { inputs: [] };
      }

      let contractId = body?.data?.contract?.id || body?.data?.contract_id || '';

      return {
        inputs: [
          {
            eventStatus: status,
            contractId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventStatus, contractId, rawPayload } = ctx.input;
      let data = rawPayload?.data || {};
      let contract = data?.contract || {};

      let signers = (contract?.signers || []).map((s: any) => ({
        signerId: s.id,
        name: s.name,
        email: s.email,
        mobile: s.mobile,
        companyName: s.company_name,
        signingOrder: s.signing_order,
        autoSign: s.auto_sign,
        redirectUrl: s.redirect_url,
        signerFieldValues: s.signer_field_values
      }));

      let sentToSigner = data?.signer
        ? {
            signerId: data.signer.id,
            name: data.signer.name,
            email: data.signer.email,
            mobile: data.signer.mobile,
            companyName: data.signer.company_name,
            signingOrder: data.signer.signing_order,
            autoSign: data.signer.auto_sign,
            redirectUrl: data.signer.redirect_url
          }
        : undefined;

      let eventType = eventStatus.replace(/-/g, '_');

      return {
        type: `contract.${eventType}`,
        id: `${contractId}-${eventStatus}-${Date.now()}`,
        output: {
          contractId: contract?.id || contractId,
          contractTitle: contract?.title,
          contractMetadata: contract?.metadata || data?.metadata,
          contractSource: contract?.source,
          isTest: contract?.test,
          contractPdfUrl: contract?.contract_pdf_url,
          signers: signers.length > 0 ? signers : undefined,
          sentToSigner
        }
      };
    }
  })
  .build();
