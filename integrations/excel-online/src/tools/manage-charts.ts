import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

let chartSchema = z.object({
  chartName: z.string(),
  chartType: z.string().optional(),
  top: z.number(),
  left: z.number(),
  width: z.number(),
  height: z.number()
});

export let manageCharts = SlateTool.create(spec, {
  name: 'Manage Charts',
  key: 'manage_charts',
  description: `Create, list, update, delete charts, or retrieve a chart image from an Excel worksheet. Charts are created from data ranges and support various chart types.`,
  instructions: [
    'Use "list" to see all charts on a worksheet.',
    'Use "create" to create a new chart. Provide the chart type, source data range, and how series are derived.',
    'Use "update" to rename or reposition/resize a chart.',
    'Use "setData" to change the source data range of an existing chart.',
    'Use "getImage" to get a base64-encoded PNG image of the chart.',
    'Chart types include: ColumnClustered, ColumnStacked, Line, Pie, Bar, Area, XYScatter, and more.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workbookItemId: z.string().describe('The Drive item ID of the Excel workbook file'),
      worksheetIdOrName: z.string().describe('Worksheet ID or name'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'getImage', 'setData'])
        .describe('Operation to perform'),
      chartName: z
        .string()
        .optional()
        .describe('Chart name (required for get, update, delete, getImage, setData)'),
      chartType: z
        .string()
        .optional()
        .describe('Chart type for creation (e.g., "ColumnClustered", "Line", "Pie")'),
      sourceDataRange: z
        .string()
        .optional()
        .describe('Source data range address (e.g., "Sheet1!A1:D5") for create or setData'),
      seriesBy: z
        .enum(['Auto', 'Columns', 'Rows'])
        .optional()
        .describe('How to derive data series (default: Auto)'),
      name: z.string().optional().describe('New chart name (for update)'),
      top: z.number().optional().describe('Top position in points (for update)'),
      left: z.number().optional().describe('Left position in points (for update)'),
      width: z.number().optional().describe('Width in points (for update or getImage)'),
      height: z.number().optional().describe('Height in points (for update or getImage)'),
      fittingMode: z
        .enum(['Fit', 'FitAndCenter', 'Fill'])
        .optional()
        .describe('Image fitting mode (for getImage)'),
      sessionId: z.string().optional().describe('Optional workbook session ID')
    })
  )
  .output(
    z.object({
      charts: z.array(chartSchema).optional().describe('List of charts (for list)'),
      chart: chartSchema.optional().describe('Chart details (for get, create, update)'),
      deleted: z.boolean().optional().describe('Whether the chart was deleted'),
      imageBase64: z.string().optional().describe('Base64-encoded chart image (for getImage)'),
      dataSet: z.boolean().optional().describe('Whether source data was updated (for setData)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId,
      sessionId: ctx.input.sessionId
    });

    let mapChart = (c: any) => ({
      chartName: c.name,
      chartType: c.chartType,
      top: c.top,
      left: c.left,
      width: c.width,
      height: c.height
    });

    switch (ctx.input.action) {
      case 'list': {
        let charts = await client.listCharts(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName
        );
        return {
          output: { charts: charts.map(mapChart) },
          message: `Found **${charts.length}** chart(s) on worksheet **${ctx.input.worksheetIdOrName}**.`
        };
      }
      case 'get': {
        if (!ctx.input.chartName) throw new Error('chartName is required for get action');
        let chart = await client.getChart(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartName
        );
        return {
          output: { chart: mapChart(chart) },
          message: `Retrieved chart **${chart.name}**.`
        };
      }
      case 'create': {
        if (!ctx.input.chartType) throw new Error('chartType is required for create action');
        if (!ctx.input.sourceDataRange)
          throw new Error('sourceDataRange is required for create action');
        let chart = await client.createChart(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartType,
          ctx.input.sourceDataRange,
          ctx.input.seriesBy || 'Auto'
        );
        return {
          output: { chart: mapChart(chart) },
          message: `Created **${ctx.input.chartType}** chart from range ${ctx.input.sourceDataRange}.`
        };
      }
      case 'update': {
        if (!ctx.input.chartName) throw new Error('chartName is required for update action');
        let props: any = {};
        if (ctx.input.name !== undefined) props.name = ctx.input.name;
        if (ctx.input.top !== undefined) props.top = ctx.input.top;
        if (ctx.input.left !== undefined) props.left = ctx.input.left;
        if (ctx.input.width !== undefined) props.width = ctx.input.width;
        if (ctx.input.height !== undefined) props.height = ctx.input.height;
        let chart = await client.updateChart(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartName,
          props
        );
        return {
          output: { chart: mapChart(chart) },
          message: `Updated chart **${chart.name}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.chartName) throw new Error('chartName is required for delete action');
        await client.deleteChart(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartName
        );
        return {
          output: { deleted: true },
          message: `Deleted chart **${ctx.input.chartName}**.`
        };
      }
      case 'getImage': {
        if (!ctx.input.chartName) throw new Error('chartName is required for getImage action');
        let image = await client.getChartImage(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartName,
          ctx.input.width,
          ctx.input.height,
          ctx.input.fittingMode
        );
        return {
          output: { imageBase64: image },
          message: `Retrieved image for chart **${ctx.input.chartName}**.`
        };
      }
      case 'setData': {
        if (!ctx.input.chartName) throw new Error('chartName is required for setData action');
        if (!ctx.input.sourceDataRange)
          throw new Error('sourceDataRange is required for setData action');
        await client.setChartSourceData(
          ctx.input.workbookItemId,
          ctx.input.worksheetIdOrName,
          ctx.input.chartName,
          ctx.input.sourceDataRange,
          ctx.input.seriesBy
        );
        return {
          output: { dataSet: true },
          message: `Updated source data for chart **${ctx.input.chartName}** to range ${ctx.input.sourceDataRange}.`
        };
      }
    }
  })
  .build();
