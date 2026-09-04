import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConfluenceClient } from '../lib/client';
import { getAttachments } from './get-attachments';
import { getPage } from './get-page';
import { getPageChildren } from './get-page-children';
import { listPages } from './list-pages';
import { getSpace } from './list-spaces';
import { getComments } from './manage-comments';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token', cloudId: 'cloud-id' },
    config: {}
  }) as any;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Confluence content ID input aliases', () => {
  it('accepts contentId for get_page', async () => {
    let getPageById = vi.spyOn(ConfluenceClient.prototype, 'getPageById').mockResolvedValue({
      id: 'page-1',
      title: 'Release notes',
      status: 'current'
    } as any);

    let input = getPage.inputSchema.parse({ contentId: 'page-1' });
    let result = await getPage.handleInvocation(createCtx(input));

    expect(getPageById).toHaveBeenCalledWith('page-1', false);
    expect(result.output.pageId).toBe('page-1');
  });

  it.each(['page_id', 'content_id', 'id'] as const)('accepts %s for get_page', async alias => {
    let getPageById = vi.spyOn(ConfluenceClient.prototype, 'getPageById').mockResolvedValue({
      id: 'page-1',
      title: 'Release notes',
      status: 'current'
    } as any);

    let input = getPage.inputSchema.parse({ [alias]: 'page-1' });
    let result = await getPage.handleInvocation(createCtx(input));

    expect(getPageById).toHaveBeenCalledWith('page-1', false);
    expect(result.output.pageId).toBe('page-1');
  });

  it('prefers pageId over all get_page compatibility aliases', async () => {
    let getPageById = vi.spyOn(ConfluenceClient.prototype, 'getPageById').mockResolvedValue({
      id: 'canonical-page',
      title: 'Release notes',
      status: 'current'
    } as any);

    let input = getPage.inputSchema.parse({
      pageId: 'canonical-page',
      contentId: 'camel-alias',
      page_id: 'snake-page-alias',
      content_id: 'snake-content-alias',
      id: 'generic-alias'
    });
    await getPage.handleInvocation(createCtx(input));

    expect(getPageById).toHaveBeenCalledWith('canonical-page', false);
  });

  it.each([
    ['https://example.atlassian.net/wiki/x/tRnHAQ', '29825461'],
    ['https://example.atlassian.net/wiki/spaces/DEV/pages/29825461/Release-notes', '29825461'],
    ['https://example.atlassian.net/wiki/pages/viewpage.action?pageId=29825461', '29825461']
  ])('resolves a Confluence page URL for get_page', async (url, expectedPageId) => {
    let getPageById = vi.spyOn(ConfluenceClient.prototype, 'getPageById').mockResolvedValue({
      id: expectedPageId,
      title: 'Release notes',
      status: 'current'
    } as any);

    let input = getPage.inputSchema.parse({ url });
    await getPage.handleInvocation(createCtx(input));

    expect(getPageById).toHaveBeenCalledWith(expectedPageId, false);
  });

  it('accepts id for get_attachments', async () => {
    let getContentAttachments = vi
      .spyOn(ConfluenceClient.prototype, 'getContentAttachments')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = getAttachments.inputSchema.parse({ id: 'page-1' });
    await getAttachments.handleInvocation(createCtx(input));

    expect(getContentAttachments).toHaveBeenCalledWith('page-1', {
      contentType: 'page',
      limit: 25,
      cursor: undefined
    });
  });

  it('accepts id for get_space', async () => {
    let getSpaceById = vi.spyOn(ConfluenceClient.prototype, 'getSpaceById').mockResolvedValue({
      id: 'space-1',
      key: 'DEV',
      name: 'Development'
    } as any);

    let input = getSpace.inputSchema.parse({ id: 'space-1' });
    await getSpace.handleInvocation(createCtx(input));

    expect(getSpaceById).toHaveBeenCalledWith('space-1');
  });

  it('caps list_pages requests at the Confluence per-request maximum', async () => {
    let getPages = vi
      .spyOn(ConfluenceClient.prototype, 'getPages')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = listPages.inputSchema.parse({ limit: 1000 });
    await listPages.handleInvocation(createCtx(input));

    expect(getPages).toHaveBeenCalledWith({
      spaceId: undefined,
      title: undefined,
      status: undefined,
      limit: 250,
      cursor: undefined,
      sort: undefined
    });
  });

  it('accepts contentId for get_page_children', async () => {
    let getPageChildrenSpy = vi
      .spyOn(ConfluenceClient.prototype, 'getPageChildren')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = getPageChildren.inputSchema.parse({ contentId: 'page-1' });
    await getPageChildren.handleInvocation(createCtx(input));

    expect(getPageChildrenSpy).toHaveBeenCalledWith('page-1', {
      limit: 25,
      cursor: undefined
    });
  });

  it('accepts contentId and maxResults for get_comments', async () => {
    let getPageFooterComments = vi
      .spyOn(ConfluenceClient.prototype, 'getPageFooterComments')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = getComments.inputSchema.parse({ contentId: 'page-1', maxResults: 20 });
    await getComments.handleInvocation(createCtx(input));

    expect(getPageFooterComments).toHaveBeenCalledWith('page-1', {
      limit: 20,
      cursor: undefined
    });
  });

  it('keeps pageId and limit as the preferred inputs', async () => {
    let getPageFooterComments = vi
      .spyOn(ConfluenceClient.prototype, 'getPageFooterComments')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = getComments.inputSchema.parse({
      pageId: 'canonical-page',
      contentId: 'alias-page',
      limit: 10,
      maxResults: 20
    });
    await getComments.handleInvocation(createCtx(input));

    expect(getPageFooterComments).toHaveBeenCalledWith('canonical-page', {
      limit: 10,
      cursor: undefined
    });
  });

  it('defaults get_comments pagination to 25 when both aliases are omitted', async () => {
    let getPageFooterComments = vi
      .spyOn(ConfluenceClient.prototype, 'getPageFooterComments')
      .mockResolvedValue({ results: [], _links: {} } as any);

    let input = getComments.inputSchema.parse({ pageId: 'page-1' });
    expect(input).not.toHaveProperty('limit');
    expect(input).not.toHaveProperty('maxResults');
    await getComments.handleInvocation(createCtx(input));

    expect(getPageFooterComments).toHaveBeenCalledWith('page-1', {
      limit: 25,
      cursor: undefined
    });
  });

  it.each([
    ['get_page', getPage],
    ['get_page_children', getPageChildren],
    ['get_comments', getComments]
  ])('rejects a blank canonical pageId for %s instead of falling through to contentId', async (_toolKey, tool) => {
    await expect(
      tool.handleInvocation(createCtx({ pageId: '', contentId: 'alias-page' }))
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['get_page with pageId', getPage, { pageId: '   ' }],
    ['get_page with contentId', getPage, { contentId: '\t' }],
    ['get_page_children with pageId', getPageChildren, { pageId: '\n' }],
    ['get_page_children with contentId', getPageChildren, { contentId: '  ' }],
    ['get_comments with pageId', getComments, { pageId: '\r\n' }],
    ['get_comments with contentId', getComments, { contentId: '\t ' }]
  ])('rejects whitespace-only IDs for %s', async (_label, tool, input) => {
    await expect(tool.handleInvocation(createCtx(input))).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['get_page', getPage],
    ['get_page_children', getPageChildren],
    ['get_comments', getComments]
  ])('rejects %s calls without either ID alias', async (_toolKey, tool) => {
    await expect(tool.handleInvocation(createCtx({}))).rejects.toBeInstanceOf(ServiceError);
  });

  it.each([
    ['get_page', getPage],
    ['get_page_children', getPageChildren],
    ['get_comments', getComments],
    ['get_attachments', getAttachments],
    ['get_space', getSpace],
    ['list_pages', listPages]
  ])('keeps the %s input schema MCP-compatible', (_toolKey, tool) => {
    let schema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

    expect(schema.type).toBe('object');
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();
    expect(schema.allOf).toBeUndefined();
  });
});
