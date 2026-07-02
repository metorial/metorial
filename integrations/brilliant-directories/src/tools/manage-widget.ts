import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWidget = SlateTool.create(spec, {
  name: 'Get Widget',
  key: 'get_widget',
  description: `Retrieve a widget from the website by its widget ID. Can also render a widget's content by ID or name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.string().describe('The widget ID to retrieve.'),
      render: z
        .boolean()
        .optional()
        .describe('If true, renders the widget content instead of returning raw data.'),
      widgetName: z
        .string()
        .optional()
        .describe('Widget name to use when rendering (alternative to widgetId for render).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      widget: z.any().describe('The widget data or rendered content.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.render) {
      let params: Record<string, any> = {};
      if (ctx.input.widgetId) params.widget_id = ctx.input.widgetId;
      if (ctx.input.widgetName) params.widget_name = ctx.input.widgetName;
      result = await client.renderWidget(params);
    } else {
      result = await client.getWidget(ctx.input.widgetId);
    }

    return {
      output: {
        status: result.status,
        widget: result.message
      },
      message: `Retrieved widget **${ctx.input.widgetId}**${ctx.input.render ? ' (rendered)' : ''}.`
    };
  })
  .build();

export let createWidget = SlateTool.create(spec, {
  name: 'Create Widget',
  key: 'create_widget',
  description: `Create a new widget on the website.`
})
  .input(
    z.object({
      widgetName: z.string().optional().describe('Name of the widget.'),
      widgetContent: z.string().optional().describe('Content of the widget.'),
      widgetStatus: z.string().optional().describe('Status of the widget.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      widget: z.any().describe('The newly created widget record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {};
    if (ctx.input.widgetName) data.widget_name = ctx.input.widgetName;
    if (ctx.input.widgetContent) data.widget_content = ctx.input.widgetContent;
    if (ctx.input.widgetStatus) data.widget_status = ctx.input.widgetStatus;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createWidget(data);

    return {
      output: {
        status: result.status,
        widget: result.message
      },
      message: `Created widget${ctx.input.widgetName ? ` **"${ctx.input.widgetName}"**` : ''}.`
    };
  })
  .build();

export let updateWidget = SlateTool.create(spec, {
  name: 'Update Widget',
  key: 'update_widget',
  description: `Update an existing widget on the website. Only one widget can be updated at a time.`,
  constraints: ['Only one widget can be updated at a time.']
})
  .input(
    z.object({
      widgetId: z.string().describe('The widget ID to update.'),
      widgetName: z.string().optional().describe('Updated name.'),
      widgetContent: z.string().optional().describe('Updated content.'),
      widgetStatus: z.string().optional().describe('Updated status.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      widget: z.any().describe('The updated widget record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      widget_id: ctx.input.widgetId
    };

    if (ctx.input.widgetName) data.widget_name = ctx.input.widgetName;
    if (ctx.input.widgetContent) data.widget_content = ctx.input.widgetContent;
    if (ctx.input.widgetStatus) data.widget_status = ctx.input.widgetStatus;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updateWidget(data);

    return {
      output: {
        status: result.status,
        widget: result.message
      },
      message: `Updated widget **${ctx.input.widgetId}**.`
    };
  })
  .build();

export let deleteWidget = SlateTool.create(spec, {
  name: 'Delete Widget',
  key: 'delete_widget',
  description: `Permanently delete a widget from the website.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      widgetId: z.string().describe('The widget ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deleteWidget(ctx.input.widgetId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted widget **${ctx.input.widgetId}**.`
    };
  })
  .build();
