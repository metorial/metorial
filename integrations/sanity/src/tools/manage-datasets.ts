import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { dataset, invalid, nativeDataset, projectId } from '../lib/schemas';
import { spec } from '../spec';

export const manageDatasets = SlateTool.create(spec, {
  name: 'Manage Datasets',
  key: 'manage_datasets',
  description:
    'List datasets, read one dataset, create a dataset, or permanently delete a dataset. Call list_projects to select a project. Dataset deletion affects all content and does not promise removal from caches, history, backups, or external deliveries.',
  instructions: [
    'Use list for discovery; get/create/delete require datasetName.',
    'Creation and deletion can retain billing, audit, automation, or webhook effects. Confirm isolated ownership before destructive operations.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      projectId: projectId.optional(),
      action: z.enum(['list', 'create', 'delete', 'get']),
      datasetName: dataset.optional(),
      aclMode: z.enum(['public', 'private', 'custom']).optional()
    })
  )
  .output(
    z.object({
      datasets: z.array(nativeDataset).optional(),
      created: z
        .object({ datasetName: z.string(), aclMode: z.string().optional() })
        .passthrough()
        .optional(),
      deleted: z.boolean().optional(),
      dataset: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    const i = ctx.input;
    if (i.action === 'list' && (i.datasetName !== undefined || i.aclMode !== undefined))
      throw invalid('For list, omit datasetName and aclMode.');
    if (i.action !== 'create' && i.aclMode !== undefined)
      throw invalid('aclMode applies only to create.');
    if (i.action !== 'list' && !i.datasetName)
      throw invalid('Provide datasetName for get, create, or delete.');
    const c = clientFor(ctx);
    if (i.action === 'list')
      return {
        output: { datasets: await c.listDatasets() },
        message: 'Retrieved native dataset discovery.'
      };
    if (i.action === 'get')
      return {
        output: { dataset: await c.getDataset(i.datasetName!) },
        message: 'Retrieved the exact dataset.'
      };
    if (i.action === 'create') {
      const native = await c.createDataset(i.datasetName!, i.aclMode);
      return {
        output: { created: { ...native, datasetName: i.datasetName! } },
        message: 'Created and read back the dataset.'
      };
    }
    await c.deleteDataset(i.datasetName!);
    return {
      output: { deleted: true },
      message:
        'Native deletion was accepted and the dataset is absent from discovery. Retained history and cache effects are not erased by this receipt.'
    };
  })
  .build();
