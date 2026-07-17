import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ConfluenceClient } from '../lib/client';
import { getPage } from './get-page';
import { getPageChildren } from './get-page-children';
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
    ['get_comments', getComments]
  ])('keeps the %s input schema MCP-compatible', (_toolKey, tool) => {
    let schema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

    expect(schema.type).toBe('object');
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();
    expect(schema.allOf).toBeUndefined();
  });
});
