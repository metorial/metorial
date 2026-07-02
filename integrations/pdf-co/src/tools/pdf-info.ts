import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPdfInfo = SlateTool.create(spec, {
  name: 'Get PDF Info',
  key: 'get_pdf_info',
  description: `Read PDF metadata and document information including page count, author, title, creation date, encryption status, and security permissions.
Use this to inspect a PDF's properties before performing other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the PDF file to inspect'),
      password: z.string().optional().describe('Password for protected PDF files')
    })
  )
  .output(
    z.object({
      pageCount: z.number().describe('Total number of pages'),
      author: z.string().optional().describe('Document author'),
      title: z.string().optional().describe('Document title'),
      producer: z.string().optional().describe('PDF producer software'),
      subject: z.string().optional().describe('Document subject'),
      creationDate: z.string().optional().describe('Document creation date'),
      modificationDate: z.string().optional().describe('Last modification date'),
      encrypted: z.boolean().describe('Whether the document is encrypted'),
      allowPrinting: z.boolean().optional().describe('Whether printing is allowed'),
      allowModification: z.boolean().optional().describe('Whether modification is allowed'),
      allowContentExtraction: z
        .boolean()
        .optional()
        .describe('Whether content extraction is allowed'),
      allowFormFilling: z.boolean().optional().describe('Whether form filling is allowed'),
      creditsUsed: z.number().describe('API credits consumed'),
      remainingCredits: z.number().describe('Credits remaining on the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPdfInfo({
      url: ctx.input.sourceUrl,
      password: ctx.input.password
    });

    if (result.error) {
      throw new Error(`Failed to read PDF info: ${result.message || 'Unknown error'}`);
    }

    let info = result.info;

    return {
      output: {
        pageCount: info.PageCount,
        author: info.Author || undefined,
        title: info.Title || undefined,
        producer: info.Producer || undefined,
        subject: info.Subject || undefined,
        creationDate: info.CreationDate || undefined,
        modificationDate: info.ModificationDate || undefined,
        encrypted: info.Encrypted,
        allowPrinting: info.PermissionPrinting,
        allowModification: info.PermissionModifyDocument,
        allowContentExtraction: info.PermissionContentExtraction,
        allowFormFilling: info.PermissionFillForms,
        creditsUsed: result.credits,
        remainingCredits: result.remainingCredits
      },
      message: `PDF has **${info.PageCount}** page(s)${info.Title ? `, title: "${info.Title}"` : ''}${info.Author ? `, author: ${info.Author}` : ''}. Encrypted: ${info.Encrypted ? 'yes' : 'no'}.`
    };
  })
  .build();
