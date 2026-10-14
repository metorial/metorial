import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let listKms = SlateTool.create(spec, {
  name: 'List Key Management Systems',
  key: 'list_kms',
  description:
    'List the key management systems available to your Starton project. Use a returned KMS ID to create a wallet with manage_wallets.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(2500)
        .default(20)
        .describe('Number of key management systems per page'),
      page: z.number().int().min(0).default(0).describe('Zero-based page number')
    })
  )
  .output(
    z.object({
      keyManagementSystems: z.array(
        z.object({
          kmsId: z.string().describe('KMS identifier accepted by manage_wallets'),
          name: z.string().describe('KMS name'),
          provider: z.string().describe('KMS provider, such as AWS or Vault'),
          projectId: z.string().describe('Project containing the KMS')
        })
      ),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new StartonClient({ token: ctx.auth.token }).listKms(ctx.input);
    return {
      output: {
        keyManagementSystems: result.items.map(
          (kms: { id: string; name: string; provider: string; projectId: string }) => ({
            kmsId: kms.id,
            name: kms.name,
            provider: kms.provider,
            projectId: kms.projectId
          })
        ),
        totalCount: result.meta?.totalItems ?? result.items.length,
        currentPage: result.meta?.currentPage,
        totalPages: result.meta?.totalPages
      },
      message: `Found ${result.items.length} key management systems.`
    };
  })
  .build();
