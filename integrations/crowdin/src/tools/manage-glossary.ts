import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { attachDownload } from '../lib/downloads';
import { createClient } from '../lib/helpers';
import { rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageGlossaryTool = SlateTool.create(spec, {
  name: 'Manage Glossary',
  key: 'manage_glossary',
  description: `List, create, update, or delete glossaries. Glossaries maintain terminology for translation consistency. Also supports managing individual terms within a glossary.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_glossaries',
          'get_glossary',
          'create_glossary',
          'delete_glossary',
          'list_terms',
          'add_term',
          'update_term',
          'delete_term',
          'update_glossary',
          'export',
          'export_status',
          'download_export'
        ])
        .describe('Action to perform'),
      exportId: z
        .string()
        .optional()
        .describe('Export job identifier, required for export_status/download_export'),
      format: z
        .enum(['tbx', 'csv', 'xlsx'])
        .optional()
        .describe('Glossary export file format'),
      conceptId: z
        .number()
        .optional()
        .describe('Concept ID from list_terms to group translated terms'),
      glossaryId: z.number().optional().describe('Glossary ID'),
      termId: z.number().optional().describe('Term ID (for update_term/delete_term)'),
      name: z.string().optional().describe('Glossary name (for create_glossary)'),
      languageId: z
        .string()
        .optional()
        .describe('Source language code (for create_glossary/add_term)'),
      text: z.string().optional().describe('Term text (for add_term)'),
      description: z.string().optional().describe('Term description'),
      partOfSpeech: z
        .string()
        .optional()
        .describe('Part of speech (noun, verb, adjective, etc.)'),
      termStatus: z
        .enum(['preferred', 'admitted', 'not recommended', 'obsolete'])
        .optional()
        .describe('Term status'),
      translationOfTermId: z
        .number()
        .optional()
        .describe('Link to source term ID (for adding translations)'),
      limit: z.number().optional(),
      offset: z.number().optional()
    })
  )
  .output(
    z.object({
      raw: rawSchema,
      glossaries: z
        .array(
          z.object({
            glossaryId: z.number(),
            name: z.string().optional(),
            languageId: z.string(),
            termsCount: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      terms: z
        .array(
          z.object({
            termId: z.number(),
            glossaryId: z.number(),
            languageId: z.string(),
            text: z.string(),
            description: z.string().optional(),
            partOfSpeech: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      exportId: z.string().optional(),
      exportStatus: z.string().optional(),
      progress: z.number().optional(),
      downloadUrl: z.string().optional(),
      expiresAt: z.string().optional(),
      pagination: z
        .object({
          offset: z.number(),
          limit: z.number()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list_glossaries') {
      let result = await client.listGlossaries({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let glossaries = result.data.map((item: any) => ({
        glossaryId: item.data.id,
        name: item.data.name ?? undefined,
        languageId: item.data.languageId,
        termsCount: item.data.terms ?? item.data.termsCount,
        createdAt: item.data.createdAt
      }));

      return {
        output: { raw: client.lastResponse, glossaries, pagination: result.pagination },
        message: `Found **${glossaries.length}** glossaries.`
      };
    }

    if (action === 'get_glossary') {
      if (!ctx.input.glossaryId) throw createApiServiceError('glossaryId is required');
      let glossary = await client.getGlossary(ctx.input.glossaryId);

      return {
        output: {
          raw: client.lastResponse,
          glossaries: [
            {
              glossaryId: glossary.id,
              name: glossary.name ?? undefined,
              languageId: glossary.languageId,
              termsCount: glossary.terms ?? glossary.termsCount,
              createdAt: glossary.createdAt
            }
          ]
        },
        message: `Retrieved glossary **${glossary.name}** (ID: ${glossary.id}).`
      };
    }

    if (action === 'create_glossary') {
      if (!ctx.input.name || !ctx.input.languageId) {
        throw createApiServiceError('name and languageId are required');
      }

      let glossary = await client.createGlossary({
        name: ctx.input.name,
        languageId: ctx.input.languageId
      });

      return {
        output: {
          raw: client.lastResponse,
          glossaries: [
            {
              glossaryId: glossary.id,
              name: glossary.name ?? undefined,
              languageId: glossary.languageId,
              termsCount: glossary.terms,
              createdAt: glossary.createdAt
            }
          ]
        },
        message: `Created glossary **${glossary.name}** (ID: ${glossary.id}).`
      };
    }

    if (action === 'delete_glossary') {
      if (!ctx.input.glossaryId) throw createApiServiceError('glossaryId is required');
      await client.deleteGlossary(ctx.input.glossaryId);

      return {
        output: { raw: client.lastResponse, deleted: true },
        message: `Deleted glossary with ID **${ctx.input.glossaryId}**.`
      };
    }

    if (action === 'list_terms') {
      if (!ctx.input.glossaryId) throw createApiServiceError('glossaryId is required');

      let result = await client.listTerms(ctx.input.glossaryId, {
        languageId: ctx.input.languageId,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let terms = result.data.map((item: any) => ({
        termId: item.data.id,
        glossaryId: item.data.glossaryId,
        languageId: item.data.languageId,
        text: item.data.text,
        description: item.data.description ?? undefined,
        partOfSpeech: item.data.partOfSpeech ?? undefined,
        status: item.data.status ?? undefined,
        createdAt: item.data.createdAt
      }));

      return {
        output: { raw: client.lastResponse, terms, pagination: result.pagination },
        message: `Found **${terms.length}** terms in glossary ${ctx.input.glossaryId}.`
      };
    }

    if (action === 'add_term') {
      if (!ctx.input.glossaryId || !ctx.input.languageId || !ctx.input.text) {
        throw createApiServiceError('glossaryId, languageId, and text are required');
      }

      let term = await client.addTerm(ctx.input.glossaryId, {
        languageId: ctx.input.languageId,
        text: ctx.input.text,
        description: ctx.input.description,
        partOfSpeech: ctx.input.partOfSpeech,
        status: ctx.input.termStatus,
        translationOfTermId: ctx.input.translationOfTermId,
        conceptId: ctx.input.conceptId
      });

      return {
        output: {
          raw: client.lastResponse,
          terms: [
            {
              termId: term.id,
              glossaryId: term.glossaryId,
              languageId: term.languageId,
              text: term.text,
              description: term.description ?? undefined,
              partOfSpeech: term.partOfSpeech ?? undefined,
              status: term.status ?? undefined,
              createdAt: term.createdAt
            }
          ]
        },
        message: `Added term **${term.text}** (ID: ${term.id}) to glossary ${ctx.input.glossaryId}.`
      };
    }

    if (action === 'update_term') {
      if (!ctx.input.glossaryId || !ctx.input.termId) {
        throw createApiServiceError('glossaryId and termId are required');
      }

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.text !== undefined)
        patches.push({ op: 'replace', path: '/text', value: ctx.input.text });
      if (ctx.input.description !== undefined)
        patches.push({ op: 'replace', path: '/description', value: ctx.input.description });
      if (ctx.input.partOfSpeech !== undefined)
        patches.push({ op: 'replace', path: '/partOfSpeech', value: ctx.input.partOfSpeech });
      if (ctx.input.termStatus !== undefined)
        patches.push({ op: 'replace', path: '/status', value: ctx.input.termStatus });

      if (!patches.length)
        throw createApiServiceError('Provide at least one term field to update.');
      let term = await client.updateTerm(ctx.input.glossaryId, ctx.input.termId, patches);

      return {
        output: {
          raw: client.lastResponse,
          terms: [
            {
              termId: term.id,
              glossaryId: term.glossaryId,
              languageId: term.languageId,
              text: term.text,
              description: term.description ?? undefined,
              partOfSpeech: term.partOfSpeech ?? undefined,
              status: term.status ?? undefined,
              createdAt: term.createdAt
            }
          ]
        },
        message: `Updated term **${term.text}** (ID: ${term.id}).`
      };
    }

    if (action === 'delete_term') {
      if (!ctx.input.glossaryId || !ctx.input.termId) {
        throw createApiServiceError('glossaryId and termId are required');
      }
      await client.deleteTerm(ctx.input.glossaryId, ctx.input.termId);

      return {
        output: { raw: client.lastResponse, deleted: true },
        message: `Deleted term with ID **${ctx.input.termId}** from glossary ${ctx.input.glossaryId}.`
      };
    }

    if (action === 'update_glossary') {
      if (!ctx.input.glossaryId || ctx.input.name === undefined)
        throw createApiServiceError('glossaryId and name are required.');
      const glossary = await client.updateGlossary(ctx.input.glossaryId, [
        { op: 'replace', path: '/name', value: ctx.input.name }
      ]);
      return {
        output: {
          raw: client.lastResponse,
          glossaries: [
            {
              glossaryId: glossary.id,
              name: glossary.name ?? undefined,
              languageId: glossary.languageId,
              termsCount: glossary.terms ?? glossary.termsCount,
              createdAt: glossary.createdAt
            }
          ]
        },
        message: 'Updated the glossary.'
      };
    }
    if (action === 'export' || action === 'export_status' || action === 'download_export') {
      if (!ctx.input.glossaryId) throw createApiServiceError('glossaryId is required.');
      if (action === 'export') {
        const result = await client.exportGlossary(ctx.input.glossaryId, {
          format: ctx.input.format
        });
        return {
          output: {
            raw: client.lastResponse,
            exportId: result.identifier,
            exportStatus: result.status,
            progress: result.progress
          },
          message: `Glossary export status: ${result.status}.`
        };
      }
      if (!ctx.input.exportId) throw createApiServiceError('exportId is required.');
      if (action === 'export_status') {
        const result = await client.getGlossaryExportStatus(
          ctx.input.glossaryId,
          ctx.input.exportId
        );
        return {
          output: {
            raw: client.lastResponse,
            exportId: result.identifier,
            exportStatus: result.status,
            progress: result.progress
          },
          message: `Glossary export status: ${result.status}.`
        };
      }
      const result = await client.downloadGlossaryExport(
        ctx.input.glossaryId,
        ctx.input.exportId
      );
      const file = await attachDownload(ctx, result, {
        kind: 'glossary',
        glossaryId: ctx.input.glossaryId,
        exportId: ctx.input.exportId
      });
      return {
        output: {
          raw: client.lastResponse,
          exportId: ctx.input.exportId,
          downloadUrl: file.url,
          expiresAt: file.expiresAt
        },
        message: 'The glossary download is ready.'
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
