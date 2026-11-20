import {
  optionList,
  Slate,
  SlateAuth,
  SlateConfig,
  SlateSpecification,
  triggerGroup
} from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  createLocalSlateTestClient,
  listSlateOptionListOptions,
  listSlateTriggerGroupSelectionOptions
} from './index';

let fixture = () => {
  let calls: { auth: unknown; config: unknown; input: any }[] = [];
  let auth = SlateAuth.create<{ token: string }>()
    .output(z.object({ token: z.string() }))
    .addTokenAuth({
      type: 'auth.token',
      key: 'token',
      name: 'Token',
      inputSchema: z.object({ token: z.string() }),
      getOutput: async ctx => ({ output: ctx.input })
    });
  let spec = SlateSpecification.create({
    key: 'files',
    name: 'Files',
    description: 'Option list contract',
    auth,
    config: SlateConfig.create(z.object({ tenant: z.string() }))
  });
  let files = optionList(spec, {
    key: 'files',
    paramsSchema: z.object({
      kind: z.enum(['sheet', 'doc']),
      limit: z.number().int().default(10)
    }),
    list: async ctx => {
      calls.push({ auth: ctx.auth, config: ctx.config, input: ctx.input });
      return {
        options: [
          {
            value: `${ctx.input.params.kind}-1`,
            label: `${ctx.auth.token} ${ctx.config.tenant}`
          }
        ],
        nextPageToken: ctx.input.pageToken ? undefined : { offset: 1 }
      };
    }
  });
  let folders = optionList(spec, {
    key: 'folders',
    list: async ctx => {
      calls.push({ auth: ctx.auth, config: ctx.config, input: ctx.input });
      return { options: [] };
    }
  });
  let watch = triggerGroup(spec, {
    key: 'watch',
    name: 'Watch',
    selectionSchema: z.object({ fileId: z.string(), folderId: z.string() })
  })
    .polling({ pollEvents: async () => ({ events: [] }) })
    .routingMatchers(async () => [])
    .selectionOptions({
      fileId: {
        list: async () => ({ options: [{ value: 'own', label: 'Own' }] }),
        linked: { slate: 'acme/drive', optionList: 'files', params: { kind: 'sheet' } }
      },
      folderId: { linked: { slate: 'acme/drive', optionList: 'folders' } }
    })
    .build();
  let slate = Slate.create({
    spec,
    tools: [],
    triggers: [],
    triggerGroups: [watch],
    optionLists: [files, folders]
  });
  let client = createLocalSlateTestClient({
    slate,
    state: {
      config: { tenant: 'tenant' },
      auth: { authenticationMethodId: 'token', output: { token: 'credential' } }
    }
  });

  return { client, calls };
};

describe('option list protocol helpers', () => {
  it('lists an exported option list with parsed params, auth and config', async () => {
    let { client, calls } = fixture();

    let first = await listSlateOptionListOptions({
      client,
      optionListId: 'files',
      query: '  budget ',
      params: { kind: 'sheet' }
    });
    expect(first).toEqual({
      options: [{ value: 'sheet-1', label: 'credential tenant' }],
      nextPageToken: { offset: 1 }
    });
    expect(calls.at(-1)).toEqual({
      auth: { token: 'credential' },
      config: { tenant: 'tenant' },
      input: { query: 'budget', pageToken: null, params: { kind: 'sheet', limit: 10 } }
    });

    let last = await listSlateOptionListOptions({
      client,
      optionListId: 'files',
      query: '   ',
      pageToken: { offset: 1 },
      params: { kind: 'doc', limit: 5 }
    });
    expect(last.nextPageToken).toBeNull();
    expect(calls.at(-1)?.input).toEqual({
      query: null,
      pageToken: { offset: 1 },
      params: { kind: 'doc', limit: 5 }
    });

    await listSlateOptionListOptions({ client, optionListId: 'folders' });
    expect(calls.at(-1)?.input).toEqual({ query: null, pageToken: null, params: {} });
  });

  it('rejects unknown option lists, invalid params and unknown param keys', async () => {
    let { client, calls } = fixture();

    await expect(
      listSlateOptionListOptions({ client, optionListId: 'missing' })
    ).rejects.toThrow('Invalid option list ID: missing');
    await expect(
      listSlateOptionListOptions({ client, optionListId: 'files', params: { kind: 'pdf' } })
    ).rejects.toThrow('Invalid params for option list "files"');
    await expect(
      listSlateOptionListOptions({ client, optionListId: 'files' })
    ).rejects.toThrow('Invalid params for option list "files"');
    await expect(
      listSlateOptionListOptions({
        client,
        optionListId: 'files',
        params: { kind: 'sheet', mimeType: 'sheet' }
      })
    ).rejects.toThrow('Invalid params for option list "files"');
    await expect(
      listSlateOptionListOptions({
        client,
        optionListId: 'folders',
        params: { kind: 'sheet' }
      })
    ).rejects.toThrow('Invalid params for option list "folders"');
    expect(calls).toEqual([]);
  });

  it('advertises linked sources and only lists fields with their own list', async () => {
    let { client } = fixture();
    let schema = (await client.getTriggerGroup('watch')).triggerGroup.selectionSchema;

    expect(schema?.properties.fileId).toMatchObject({
      'x-slates-options': true,
      'x-slates-options-linked': {
        slate: 'acme/drive',
        optionList: 'files',
        params: { kind: 'sheet' }
      }
    });
    expect(schema?.properties.folderId).not.toHaveProperty('x-slates-options');
    expect(schema?.properties.folderId['x-slates-options-linked']).toEqual({
      slate: 'acme/drive',
      optionList: 'folders',
      params: {}
    });

    let own = await listSlateTriggerGroupSelectionOptions({
      client,
      triggerGroupId: 'watch',
      field: 'fileId'
    });
    expect(own.options).toEqual([{ value: 'own', label: 'Own' }]);
    await expect(
      listSlateTriggerGroupSelectionOptions({
        client,
        triggerGroupId: 'watch',
        field: 'folderId'
      })
    ).rejects.toThrow('has no options for selection field: folderId');
  });
});
