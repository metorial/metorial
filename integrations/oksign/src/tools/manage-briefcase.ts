import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBriefcase = SlateTool.create(spec, {
  name: 'Create Briefcase',
  key: 'create_briefcase',
  description: `Bundle multiple documents together so signers can sign all of them using a single signing link. Each document must have its form descriptor configured beforehand, and all documents must use the same signer IDs. Supports custom package names displayed during signing.`,
  instructions: [
    'All documents in the briefcase must belong to the same account.',
    'Signer IDs must be consistent across all documents in the bundle.',
    'Each document must have its form descriptor configured before adding to a briefcase.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentIds: z.array(z.string()).describe('Array of document IDs to bundle'),
      packageName: z
        .string()
        .optional()
        .describe('Custom package name displayed during the signing process'),
      callbackUrl: z.string().optional().describe('URL called when a document is signed'),
      returnUrl: z.string().optional().describe('URL to redirect the signer after signing'),
      webhookUrl: z.string().optional().describe('URL for notification delivery error reports')
    })
  )
  .output(
    z.object({
      briefcaseId: z.string().describe('Briefcase token ID'),
      briefcaseDetails: z.any().describe('Full briefcase creation response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBriefcase({
      packagename: ctx.input.packageName,
      documents: ctx.input.documentIds.map(id => ({ docid: id })),
      callbackURL: ctx.input.callbackUrl,
      returnURL: ctx.input.returnUrl,
      webhookURL: ctx.input.webhookUrl
    });

    return {
      output: {
        briefcaseId:
          typeof result === 'string' ? result : result?.docid || JSON.stringify(result),
        briefcaseDetails: result
      },
      message: `Briefcase created with **${ctx.input.documentIds.length}** document(s).`
    };
  })
  .build();

export let getBriefcase = SlateTool.create(spec, {
  name: 'Get Briefcase',
  key: 'get_briefcase',
  description: `Retrieve configuration and details of an existing briefcase (document bundle).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      briefcaseId: z.string().describe('Briefcase token ID')
    })
  )
  .output(
    z.object({
      briefcaseDetails: z.any().describe('Briefcase configuration and status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let briefcaseDetails = await client.retrieveBriefcase(ctx.input.briefcaseId);

    return {
      output: { briefcaseDetails },
      message: `Briefcase \`${ctx.input.briefcaseId}\` retrieved.`
    };
  })
  .build();

export let removeBriefcase = SlateTool.create(spec, {
  name: 'Remove Briefcase',
  key: 'remove_briefcase',
  description: `Delete a briefcase (document bundle) from the OKSign platform. This does not delete the individual documents.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      briefcaseId: z.string().describe('Briefcase token ID to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the briefcase was removed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeBriefcase(ctx.input.briefcaseId);

    return {
      output: { removed: true },
      message: `Briefcase \`${ctx.input.briefcaseId}\` removed.`
    };
  })
  .build();
