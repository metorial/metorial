import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMockServerTool = SlateTool.create(spec, {
  name: 'Manage Mock Server',
  key: 'manage_mock_server',
  description: `Create, get, update, list, or delete Postman mock servers. Mock servers simulate API responses based on collection examples, useful for frontend development and API testing without a backend.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'list', 'delete'])
        .describe('Operation to perform'),
      mockId: z
        .string()
        .optional()
        .describe('Mock server ID (required for get, update, delete)'),
      workspaceId: z.string().optional().describe('Workspace ID (used for create and list)'),
      name: z.string().optional().describe('Mock server name'),
      collectionUid: z
        .string()
        .optional()
        .describe('Collection UID to mock (required for create)'),
      environmentUid: z.string().optional().describe('Environment UID to use with the mock'),
      isPrivate: z
        .boolean()
        .optional()
        .describe('Whether the mock requires an API key to access')
    })
  )
  .output(
    z.object({
      mock: z
        .object({
          mockId: z.string().optional(),
          name: z.string().optional(),
          uid: z.string().optional(),
          mockUrl: z.string().optional(),
          collectionUid: z.string().optional(),
          environmentUid: z.string().optional(),
          isPublic: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      mocks: z
        .array(
          z.object({
            mockId: z.string(),
            name: z.string().optional(),
            uid: z.string().optional(),
            mockUrl: z.string().optional(),
            collectionUid: z.string().optional(),
            isPublic: z.boolean().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, mockId, workspaceId, name, collectionUid, environmentUid, isPrivate } =
      ctx.input;

    let mapMock = (m: any) => ({
      mockId: m.id,
      name: m.name,
      uid: m.uid,
      mockUrl: m.mockUrl,
      collectionUid: m.collection,
      environmentUid: m.environment,
      isPublic: m.isPublic,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    });

    if (action === 'list') {
      let mocks = await client.listMocks(workspaceId ? { workspace: workspaceId } : undefined);
      let result = mocks.map((m: any) => ({
        mockId: m.id,
        name: m.name,
        uid: m.uid,
        mockUrl: m.mockUrl,
        collectionUid: m.collection,
        isPublic: m.isPublic
      }));
      return {
        output: { mocks: result },
        message: `Found **${result.length}** mock server(s).`
      };
    }

    if (action === 'get') {
      if (!mockId) throw new Error('mockId is required for get.');
      let mock = await client.getMock(mockId);
      return {
        output: { mock: mapMock(mock) },
        message: `Retrieved mock server **"${mock.name}"** at ${mock.mockUrl}.`
      };
    }

    if (action === 'create') {
      if (!collectionUid) throw new Error('collectionUid is required for create.');
      let mock = await client.createMock(
        {
          name,
          collection: collectionUid,
          environment: environmentUid,
          private: isPrivate
        },
        workspaceId
      );
      return {
        output: { mock: mapMock(mock) },
        message: `Created mock server **"${mock.name}"** at ${mock.mockUrl}.`
      };
    }

    if (action === 'update') {
      if (!mockId) throw new Error('mockId is required for update.');
      let mock = await client.updateMock(mockId, {
        name,
        environment: environmentUid,
        private: isPrivate
      });
      return {
        output: { mock: mapMock(mock) },
        message: `Updated mock server **"${mock.name}"**.`
      };
    }

    if (!mockId) throw new Error('mockId is required for delete.');
    let mock = await client.deleteMock(mockId);
    return {
      output: { mock: { mockId: mock.id, uid: mock.uid } },
      message: `Deleted mock server **${mockId}**.`
    };
  })
  .build();
