import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let widgetOutputSchema = z.object({
  widgetId: z.string(),
  widgetType: z.string(),
  text: z.string().optional(),
  title: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  style: z.record(z.string(), z.any()).optional(),
  properties: z.record(z.string(), z.any()).optional()
});

let mapWidget = (w: any) => ({
  widgetId: w.id,
  widgetType: w.type,
  text: w.text ?? w.message,
  title: w.title,
  x: w.x,
  y: w.y,
  width: w.width,
  height: w.height,
  style: w.style,
  properties: Object.fromEntries(
    Object.entries(w).filter(
      ([k]) =>
        !['id', 'type', 'text', 'title', 'x', 'y', 'width', 'height', 'style'].includes(k)
    )
  )
});

export let listWidgetsTool = SlateTool.create(spec, {
  name: 'List Widgets',
  key: 'list_widgets',
  description: `List all widgets (sticky notes, shapes, text, images, arrows, areas, comments, etc.) on a mural canvas. Supports pagination for large murals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to list widgets from'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Limit must be a whole number.')
        .min(1)
        .optional()
        .describe('Maximum number of widgets to return'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      widgets: z.array(widgetOutputSchema),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.listWidgets(ctx.input.muralId, {
      limit: ctx.input.limit,
      next: ctx.input.nextToken
    });

    let widgets = result.value.map(mapWidget);

    return {
      output: { widgets, nextToken: result.next },
      message: `Found **${widgets.length}** widget(s) on the mural.`
    };
  })
  .build();

export let getWidgetTool = SlateTool.create(spec, {
  name: 'Get Widget',
  key: 'get_widget',
  description: `Retrieve detailed information about a specific widget on a mural by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural containing the widget'),
      widgetId: z.string().describe('ID of the widget to retrieve')
    })
  )
  .output(widgetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let w = await client.getWidget(ctx.input.muralId, ctx.input.widgetId);

    return {
      output: mapWidget(w),
      message: `Retrieved ${w.type} widget **${w.id}**.`
    };
  })
  .build();

export let createWidgetTool = SlateTool.create(spec, {
  name: 'Create Widget',
  key: 'create_widget',
  description: `Add a new widget to a mural canvas. Supports creating sticky notes, shapes, text boxes, titles, images, arrows, areas, and comments.
Specify the **widgetType** to determine which kind of widget to create, then provide the relevant properties for that type.`,
  instructions: [
    'For sticky notes: provide text, position (x, y), and optionally backgroundColor in style.',
    'For shapes: provide shape type (e.g., "rectangle", "circle"), position, dimensions, and optionally text.',
    'For images: provide assetName from the Mural asset-upload API, position, and dimensions. Source URLs alone are unsupported.',
    'For arrows: provide x, y, width, height, and at least two points. Optionally connect endpoints using startWidgetId and endWidgetId.',
    'For areas: provide title, position, and dimensions to create a grouping area.'
  ]
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to add the widget to'),
      widgetType: z
        .enum(['sticky_note', 'shape', 'text', 'title', 'image', 'arrow', 'area', 'comment'])
        .describe('Type of widget to create'),
      text: z.string().optional().describe('Text content for the widget'),
      x: z.number().optional().describe('X position on the canvas'),
      y: z.number().optional().describe('Y position on the canvas'),
      width: z.number().optional().describe('Width of the widget'),
      height: z.number().optional().describe('Height of the widget'),
      shape: z
        .string()
        .optional()
        .describe('Shape type for shape widgets (e.g., "rectangle", "circle", "triangle")'),
      url: z
        .string()
        .optional()
        .describe(
          'Source URL retained for compatibility; Mural requires assetName for image creation'
        ),
      assetName: z
        .string()
        .optional()
        .describe(
          'Required for images: uploaded asset name returned by Mural asset-upload API'
        ),
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(2)
        .optional()
        .describe('Required arrow path points; provide x, y, width, and height too'),
      startWidgetId: z.string().optional().describe('Start widget ID for arrow connectors'),
      endWidgetId: z.string().optional().describe('End widget ID for arrow connectors'),
      style: z
        .record(z.string(), z.any())
        .optional()
        .describe('Style properties (e.g., backgroundColor, borderColor)')
    })
  )
  .output(widgetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let {
      muralId,
      widgetType,
      text,
      x,
      y,
      width,
      height,
      shape,
      url,
      assetName,
      points,
      startWidgetId,
      endWidgetId,
      style
    } = ctx.input;
    if (
      widgetType === 'arrow' &&
      (x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined ||
        !points)
    )
      throw createApiServiceError(
        'Arrow creation requires x, y, width, height, and at least two points.'
      );
    if (
      widgetType === 'image' &&
      (!assetName ||
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined)
    )
      throw createApiServiceError(
        'Image creation requires assetName, x, y, width, and height.'
      );
    if (widgetType === 'comment' && text === undefined)
      throw createApiServiceError('Comment creation requires text.');
    if (
      widgetType === 'sticky_note' &&
      shape !== undefined &&
      !['rectangle', 'circle'].includes(shape)
    )
      throw createApiServiceError('Sticky-note shape must be rectangle or circle.');
    let w: any;

    switch (widgetType) {
      case 'sticky_note':
        w = await client.createStickyNote(muralId, {
          text,
          x: x ?? 0,
          y: y ?? 0,
          width,
          height,
          style,
          shape: shape ?? 'rectangle'
        });
        break;
      case 'shape':
        w = await client.createShape(muralId, {
          text,
          x: x ?? 0,
          y: y ?? 0,
          width,
          height,
          shape: shape ?? 'rectangle',
          style
        });
        break;
      case 'text':
        w = await client.createTextBox(muralId, { text, x, y, width, height, style });
        break;
      case 'title':
        w = await client.createTitle(muralId, { text, x, y, style });
        break;
      case 'image':
        w = await client.createImage(muralId, {
          url,
          name: assetName,
          x,
          y,
          width,
          height,
          title: text
        });
        break;
      case 'arrow':
        w = await client.createArrow(muralId, {
          startWidgetId,
          endWidgetId,
          x,
          y,
          width,
          height,
          points,
          style
        });
        break;
      case 'area':
        w = await client.createArea(muralId, { title: text, x, y, width, height, style });
        break;
      case 'comment':
        w = await client.createComment(muralId, { text, x: x ?? 0, y: y ?? 0 });
        break;
    }

    return {
      output: mapWidget(w),
      message: `Created **${widgetType}** widget on the mural.`
    };
  })
  .build();

export let updateWidgetTool = SlateTool.create(spec, {
  name: 'Update Widget',
  key: 'update_widget',
  description: `Update an existing widget on a mural. Specify the **widgetType** matching the widget being updated, along with the properties to change.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural containing the widget'),
      widgetId: z.string().describe('ID of the widget to update'),
      widgetType: z
        .enum(['sticky_note', 'shape', 'text', 'title', 'image', 'arrow', 'area', 'comment'])
        .describe('Type of the widget being updated'),
      text: z.string().optional().describe('Updated text content'),
      x: z.number().optional().describe('Updated X position'),
      y: z.number().optional().describe('Updated Y position'),
      width: z.number().optional().describe('Updated width'),
      height: z.number().optional().describe('Updated height'),
      style: z.record(z.string(), z.any()).optional().describe('Updated style properties')
    })
  )
  .output(widgetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { muralId, widgetId, widgetType, text, x, y, width, height, style } = ctx.input;
    let body: Record<string, any> = {};
    if (text !== undefined) body.text = text;
    if (x !== undefined) body.x = x;
    if (y !== undefined) body.y = y;
    if (width !== undefined) body.width = width;
    if (height !== undefined) body.height = height;
    if (style !== undefined) body.style = style;

    let w: any;
    switch (widgetType) {
      case 'sticky_note':
        w = await client.updateStickyNote(muralId, widgetId, body);
        break;
      case 'shape':
        w = await client.updateShape(muralId, widgetId, body);
        break;
      case 'text':
        w = await client.updateTextBox(muralId, widgetId, body);
        break;
      case 'title':
        w = await client.updateTitle(muralId, widgetId, body);
        break;
      case 'image':
        if (body.text !== undefined) {
          body.caption = body.text;
          body.text = undefined;
        }
        if (body.style !== undefined)
          throw createApiServiceError(
            'Image widgets do not accept style. Omit style and update text/caption, position, or dimensions.'
          );
        w = await client.updateImage(muralId, widgetId, body);
        break;
      case 'arrow':
        if (text !== undefined)
          throw createApiServiceError(
            'Arrow text uses a structured label in Mural and cannot be changed through this tool. Omit text and update position, dimensions, or style.'
          );
        w = await client.updateArrow(muralId, widgetId, body);
        break;
      case 'area':
        if (body.text !== undefined) {
          body.title = body.text;
          body.text = undefined;
        }
        w = await client.updateArea(muralId, widgetId, body);
        break;
      case 'comment':
        if (width !== undefined || height !== undefined || style !== undefined)
          throw createApiServiceError('Comments support text and position updates only.');
        w = await client.updateComment(muralId, widgetId, body);
        break;
    }

    return {
      output: mapWidget(w),
      message: `Updated **${widgetType}** widget **${widgetId}**.`
    };
  })
  .build();
