import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfSecurity = SlateTool.create(spec, {
  name: 'PDF Security',
  key: 'pdf_security',
  description: `Add or remove password protection from a PDF document. When adding a password, you can configure encryption algorithms and set granular permissions for printing, copying, form filling, and modification.
Use "add" action to protect a PDF, or "remove" action to unlock a protected PDF.`,
  instructions: [
    'When adding security, provide at least an "ownerPassword" to restrict permissions.',
    'A "userPassword" is optional and required for opening the PDF.',
    'To remove security, provide the current password of the PDF.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source PDF file'),
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove password protection'),
      ownerPassword: z
        .string()
        .optional()
        .describe('Owner password for setting restrictions (add mode)'),
      userPassword: z
        .string()
        .optional()
        .describe('User password required to open the PDF (add mode)'),
      currentPassword: z
        .string()
        .optional()
        .describe('Current password of the protected PDF (remove mode)'),
      encryptionAlgorithm: z
        .enum(['RC4_40bit', 'RC4_128bit', 'AES_128bit', 'AES_256bit'])
        .optional()
        .describe('Encryption algorithm (add mode, default: AES_128bit)'),
      allowPrintDocument: z
        .boolean()
        .optional()
        .describe('Allow printing (add mode, default: false)'),
      allowModifyDocument: z
        .boolean()
        .optional()
        .describe('Allow document modification (add mode, default: false)'),
      allowContentExtraction: z
        .boolean()
        .optional()
        .describe('Allow content extraction/copying (add mode, default: false)'),
      allowFillForms: z
        .boolean()
        .optional()
        .describe('Allow form filling (add mode, default: false)'),
      outputFileName: z.string().optional().describe('Name for the output file')
    })
  )
  .output(
    z.object({
      outputUrl: z.string().describe('URL to download the processed PDF'),
      pageCount: z.number().describe('Number of pages in the PDF'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'add') {
      result = await client.addPassword({
        url: ctx.input.sourceUrl,
        ownerPassword: ctx.input.ownerPassword,
        userPassword: ctx.input.userPassword,
        encryptionAlgorithm: ctx.input.encryptionAlgorithm,
        allowPrintDocument: ctx.input.allowPrintDocument,
        allowModifyDocument: ctx.input.allowModifyDocument,
        allowContentExtraction: ctx.input.allowContentExtraction,
        allowFillForms: ctx.input.allowFillForms,
        name: ctx.input.outputFileName
      });
    } else {
      if (!ctx.input.currentPassword) {
        throw new Error('Current password is required to remove PDF protection');
      }
      result = await client.removePassword({
        url: ctx.input.sourceUrl,
        password: ctx.input.currentPassword,
        name: ctx.input.outputFileName
      });
    }

    if (result.error) {
      throw new Error(`PDF security operation failed: ${result.message || 'Unknown error'}`);
    }

    return {
      output: {
        outputUrl: result.url,
        pageCount: result.pageCount,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} password protection. [Download PDF](${result.url})`
    };
  })
  .build();
