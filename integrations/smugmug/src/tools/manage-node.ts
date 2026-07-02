import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nodeOutputSchema = z.object({
  nodeId: z.string().describe('Node ID'),
  type: z.string().optional().describe('Node type: Folder, Album, or Page'),
  name: z.string().describe('Node name'),
  description: z.string().optional().describe('Node description'),
  urlName: z.string().optional().describe('URL slug'),
  webUri: z.string().optional().describe('Web URL'),
  privacy: z.string().optional().describe('Privacy setting'),
  dateAdded: z.string().optional().describe('Date added'),
  dateModified: z.string().optional().describe('Date last modified'),
  hasChildren: z.boolean().optional().describe('Whether the node has children')
});

export let getNodeTool = SlateTool.create(spec, {
  name: 'Get Node',
  key: 'get_node',
  description: `Retrieve a SmugMug node (folder, album, or page) by its ID. Optionally include the node's children for browsing the content hierarchy.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nodeId: z.string().describe('Node ID to retrieve'),
      includeChildren: z.boolean().optional().describe('Whether to include child nodes'),
      childrenStart: z
        .number()
        .optional()
        .describe('Starting index for children pagination (1-based)'),
      childrenCount: z.number().optional().describe('Number of children to return')
    })
  )
  .output(
    z.object({
      nodeId: z.string().describe('Node ID'),
      type: z.string().optional().describe('Node type'),
      name: z.string().describe('Node name'),
      description: z.string().optional().describe('Node description'),
      urlName: z.string().optional().describe('URL slug'),
      webUri: z.string().optional().describe('Web URL'),
      privacy: z.string().optional().describe('Privacy setting'),
      dateAdded: z.string().optional().describe('Date added'),
      dateModified: z.string().optional().describe('Date last modified'),
      hasChildren: z.boolean().optional().describe('Whether the node has children'),
      children: z.array(nodeOutputSchema).optional().describe('Child nodes'),
      totalChildren: z.number().optional().describe('Total count of child nodes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let node = await client.getNode(ctx.input.nodeId);

    let children: any[] | undefined;
    let totalChildren: number | undefined;

    if (ctx.input.includeChildren) {
      let result = await client.getNodeChildren(ctx.input.nodeId, {
        start: ctx.input.childrenStart,
        count: ctx.input.childrenCount
      });
      children = result.items.map((child: any) => ({
        nodeId: child.NodeID || '',
        type: child.Type || undefined,
        name: child.Name || '',
        description: child.Description || undefined,
        urlName: child.UrlName || undefined,
        webUri: child.WebUri || undefined,
        privacy: child.Privacy || undefined,
        dateAdded: child.DateAdded || undefined,
        dateModified: child.DateModified || undefined,
        hasChildren: child.HasChildren || undefined
      }));
      totalChildren = result.pages.total;
    }

    return {
      output: {
        nodeId: node?.NodeID || ctx.input.nodeId,
        type: node?.Type || undefined,
        name: node?.Name || '',
        description: node?.Description || undefined,
        urlName: node?.UrlName || undefined,
        webUri: node?.WebUri || undefined,
        privacy: node?.Privacy || undefined,
        dateAdded: node?.DateAdded || undefined,
        dateModified: node?.DateModified || undefined,
        hasChildren: node?.HasChildren || undefined,
        children,
        totalChildren
      },
      message: `Retrieved ${node?.Type || 'node'} **${node?.Name || ctx.input.nodeId}**${children ? ` with ${children.length} children` : ''}`
    };
  })
  .build();

export let createNodeTool = SlateTool.create(spec, {
  name: 'Create Node',
  key: 'create_node',
  description: `Create a new folder, album, or page node in the SmugMug hierarchy. The node is created as a child of the specified parent node.`,
  constraints: ['The folder hierarchy can be at most 5 levels deep from the root.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      parentNodeId: z.string().describe('Parent node ID where the new node will be created'),
      type: z.enum(['Folder', 'Album', 'Page']).describe('Type of node to create'),
      name: z.string().describe('Node name'),
      urlName: z.string().optional().describe('URL slug (auto-generated if not provided)'),
      description: z.string().optional().describe('Node description'),
      privacy: z.enum(['Public', 'Unlisted', 'Private']).optional().describe('Privacy setting')
    })
  )
  .output(nodeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let nodeData: Record<string, any> = {
      Type: ctx.input.type,
      Name: ctx.input.name
    };
    if (ctx.input.urlName) nodeData.UrlName = ctx.input.urlName;
    if (ctx.input.description) nodeData.Description = ctx.input.description;
    if (ctx.input.privacy) nodeData.Privacy = ctx.input.privacy;

    let node = await client.createNode(ctx.input.parentNodeId, nodeData);

    return {
      output: {
        nodeId: node?.NodeID || '',
        type: node?.Type || ctx.input.type,
        name: node?.Name || ctx.input.name,
        description: node?.Description || undefined,
        urlName: node?.UrlName || undefined,
        webUri: node?.WebUri || undefined,
        privacy: node?.Privacy || undefined,
        dateAdded: node?.DateAdded || undefined,
        dateModified: node?.DateModified || undefined,
        hasChildren: node?.HasChildren || false
      },
      message: `Created ${ctx.input.type.toLowerCase()} **${ctx.input.name}**`
    };
  })
  .build();

export let updateNodeTool = SlateTool.create(spec, {
  name: 'Update Node',
  key: 'update_node',
  description: `Update an existing node (folder, album, or page) in the SmugMug hierarchy. Modify name, description, URL slug, privacy, and searchability settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      nodeId: z.string().describe('Node ID to update'),
      name: z.string().optional().describe('New name'),
      urlName: z.string().optional().describe('New URL slug'),
      description: z.string().optional().describe('New description'),
      privacy: z
        .enum(['Public', 'Unlisted', 'Private'])
        .optional()
        .describe('Privacy setting'),
      smugSearchable: z
        .enum(['No', 'Inherit from User'])
        .optional()
        .describe('Searchable on SmugMug'),
      worldSearchable: z
        .enum(['No', 'Inherit from User'])
        .optional()
        .describe('Searchable on the web')
    })
  )
  .output(nodeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let nodeData: Record<string, any> = {};
    if (ctx.input.name) nodeData.Name = ctx.input.name;
    if (ctx.input.urlName) nodeData.UrlName = ctx.input.urlName;
    if (ctx.input.description !== undefined) nodeData.Description = ctx.input.description;
    if (ctx.input.privacy) nodeData.Privacy = ctx.input.privacy;
    if (ctx.input.smugSearchable) nodeData.SmugSearchable = ctx.input.smugSearchable;
    if (ctx.input.worldSearchable) nodeData.WorldSearchable = ctx.input.worldSearchable;

    let node = await client.updateNode(ctx.input.nodeId, nodeData);

    return {
      output: {
        nodeId: node?.NodeID || ctx.input.nodeId,
        type: node?.Type || undefined,
        name: node?.Name || '',
        description: node?.Description || undefined,
        urlName: node?.UrlName || undefined,
        webUri: node?.WebUri || undefined,
        privacy: node?.Privacy || undefined,
        dateAdded: node?.DateAdded || undefined,
        dateModified: node?.DateModified || undefined,
        hasChildren: node?.HasChildren || undefined
      },
      message: `Updated node **${node?.Name || ctx.input.nodeId}**`
    };
  })
  .build();

export let deleteNodeTool = SlateTool.create(spec, {
  name: 'Delete Node',
  key: 'delete_node',
  description: `Permanently delete a node (folder, album, or page) from SmugMug. Deleting a folder will also delete all of its contents. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      nodeId: z.string().describe('Node ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the node was successfully deleted'),
      nodeId: z.string().describe('The deleted node ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    await client.deleteNode(ctx.input.nodeId);

    return {
      output: {
        deleted: true,
        nodeId: ctx.input.nodeId
      },
      message: `Deleted node **${ctx.input.nodeId}**`
    };
  })
  .build();
