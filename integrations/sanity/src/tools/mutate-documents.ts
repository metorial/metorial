import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { documentId, invalid, malformed, opaqueId, record, scopes } from '../lib/schemas';
import { spec } from '../spec';

const create = z
  .object({ _id: documentId.optional(), _type: z.string().min(1) })
  .passthrough();
const fixed = create.extend({ _id: documentId });
const selection = {
  documentId: documentId.optional(),
  query: z.string().min(1).optional(),
  params: record.optional(),
  ifRevisionID: opaqueId.optional()
};
const insert = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  replace: z.string().optional(),
  items: z.array(z.unknown())
});
export const mutationSchema = z.object({
  create: create.optional(),
  createOrReplace: fixed.optional(),
  createIfNotExists: fixed.optional(),
  delete: z.object(selection).optional(),
  patch: z
    .object({
      ...selection,
      set: record.optional(),
      setIfMissing: record.optional(),
      unset: z.array(z.string()).optional(),
      inc: z.record(z.string(), z.number()).optional(),
      dec: z.record(z.string(), z.number()).optional(),
      insert: insert.optional()
    })
    .optional()
});
export const mutateDocuments = SlateTool.create(spec, {
  name: 'Mutate Documents',
  key: 'mutate_documents',
  description:
    'Submit document mutations in one native transaction. Discover project/dataset first. Native receipts distinguish accepted operations and dry-run validation; deletion does not promise to erase transaction history, caches, backups, webhooks, or external effects.',
  instructions: [
    'Exactly one operation per mutation. Use documentId or query for patch/delete, never both.',
    'Use ifRevisionID for optimistic locking, including exact-ID deletion. createOrReplace fully replaces content. createIfNotExists can leave an existing document unchanged.',
    'GROQ delete queries have the documented 10,000-document limit; paginate by ordered _id for larger workloads.',
    'For reads immediately after writes use visibility sync. async/deferred may not yet be query-visible. No automatic retry of ambiguous writes.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      ...scopes,
      mutations: z.array(mutationSchema).min(1),
      returnDocuments: z.boolean().optional(),
      dryRun: z.boolean().optional(),
      autoGenerateArrayKeys: z.boolean().optional(),
      visibility: z.enum(['sync', 'async', 'deferred']).optional(),
      transactionId: opaqueId.optional()
    })
  )
  .output(
    z.object({
      transactionId: z.string(),
      results: z.array(
        z
          .object({
            operation: z.string(),
            documentId: z.string().optional(),
            document: z.unknown().optional()
          })
          .passthrough()
      ),
      dryRun: z.boolean().optional(),
      visibility: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const i = ctx.input;
    const mutations = i.mutations.map(m => {
      if (Object.values(m).filter(value => value !== undefined).length !== 1)
        throw invalid('Each mutation must contain exactly one operation.');
      for (const selected of [m.delete, m.patch])
        if (selected) {
          if ((selected.documentId !== undefined) === (selected.query !== undefined))
            throw invalid('Patch/delete require exactly one documentId or query.');
          if (selected.params !== undefined && !selected.query)
            throw invalid('Mutation params require a query.');
        }
      if (m.patch) {
        if (
          !['set', 'setIfMissing', 'unset', 'inc', 'dec', 'insert'].some(key =>
            Object.hasOwn(m.patch!, key)
          )
        )
          throw invalid('Provide at least one patch operation.');
        if (
          m.patch.insert &&
          [m.patch.insert.before, m.patch.insert.after, m.patch.insert.replace].filter(
            value => value !== undefined
          ).length !== 1
        )
          throw invalid('Insert requires exactly one before, after, or replace selector.');
      }
      if (m.delete) {
        const { documentId, ...rest } = m.delete;
        return { delete: { ...rest, ...(documentId ? { id: documentId } : {}) } };
      }
      if (m.patch) {
        const { documentId, ...rest } = m.patch;
        return { patch: { ...rest, ...(documentId ? { id: documentId } : {}) } };
      }
      return m;
    });
    const response = await clientFor(ctx).mutate(mutations, {
      returnDocuments: i.returnDocuments,
      dryRun: i.dryRun,
      autoGenerateArrayKeys: i.autoGenerateArrayKeys,
      visibility: i.visibility,
      transactionId: i.transactionId
    });
    const results = response.results.map(result => ({
      ...result,
      documentId: result.documentId ?? result.id
    }));
    if (results.some(result => result.document && result.document._id !== result.documentId))
      throw malformed();
    const expected = new Set(
      i.mutations.flatMap(m => {
        const fixedId =
          m.delete?.documentId ??
          m.patch?.documentId ??
          m.create?._id ??
          m.createOrReplace?._id ??
          m.createIfNotExists?._id;
        return fixedId && !fixedId.endsWith('.') ? [fixedId] : [];
      })
    );
    const prefixes = i.mutations.flatMap(m =>
      m.create?._id?.endsWith('.') ? [m.create._id] : []
    );
    const matchesPrefix = (id: string | undefined, prefix: string) =>
      typeof id === 'string' && id.startsWith(prefix) && id.length > prefix.length;
    const flexibleIds = i.mutations.some(
      m => m.delete?.query || m.patch?.query || (m.create && !m.create._id)
    );
    if (
      !flexibleIds &&
      results.some(
        result =>
          !result.documentId ||
          (!expected.has(result.documentId) &&
            !prefixes.some(prefix => matchesPrefix(result.documentId, prefix)))
      )
    )
      throw malformed();
    if (
      !i.dryRun &&
      ([...expected].some(id => !results.some(result => result.documentId === id)) ||
        prefixes.some(
          prefix => !results.some(result => matchesPrefix(result.documentId, prefix))
        ))
    )
      throw malformed();
    return {
      output: {
        transactionId: response.transactionId,
        results,
        dryRun: i.dryRun,
        visibility: i.visibility
      },
      message: i.dryRun
        ? 'Native mutation validation completed; no mutation execution was requested.'
        : 'Native transaction accepted. Returned receipts describe its operations; downstream history, cache, notification, and automation effects may remain.'
    };
  })
  .build();
