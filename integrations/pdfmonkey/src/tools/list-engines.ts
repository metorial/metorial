import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEngines = SlateTool.create(spec, {
  name: 'List PDF Engines',
  key: 'list_engines',
  description: `List PDFMonkey PDF engines available for template creation or updates. Use this before setting pdfEngineId or pdfEngineDraftId on templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      engines: z
        .array(
          z.object({
            engineId: z.string().describe('ID of the PDF engine'),
            name: z.string().describe('Engine name, such as v4'),
            deprecatedOn: z.string().nullable().describe('Deprecation date, if any')
          })
        )
        .describe('Available PDF engines')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let engines = (await client.listEngines()).map(engine => ({
      engineId: String(engine.id),
      name: String(engine.name),
      deprecatedOn: engine.deprecated_on ? String(engine.deprecated_on) : null
    }));

    return {
      output: { engines },
      message: `Found **${engines.length}** PDFMonkey engine(s).`
    };
  })
  .build();
