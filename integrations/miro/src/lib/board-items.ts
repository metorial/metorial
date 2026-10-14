import { z } from 'zod';

export let boardItemOutputSchema = z.object({
  itemId: z.string().describe('Item ID'),
  itemType: z.string().describe('Item type'),
  content: z.string().optional().describe('Text content if available'),
  title: z.string().optional().describe('Title if available'),
  position: z
    .object({
      x: z.number().optional(),
      y: z.number().optional()
    })
    .optional()
    .describe('Position on the board'),
  geometry: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
      rotation: z.number().optional()
    })
    .optional()
    .describe('Size and rotation'),
  parentId: z.string().optional().describe('Parent frame ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modification timestamp'),
  createdBy: z.string().optional().describe('Creator user ID')
});

export type MiroBoardItem = {
  id: string;
  type: string;
  data?: { content?: string | null; title?: string | null } | null;
  position?: { x?: number | null; y?: number | null } | null;
  geometry?: {
    width?: number | null;
    height?: number | null;
    rotation?: number | null;
  } | null;
  parent?: { id?: string | null } | null;
  createdAt?: string | null;
  modifiedAt?: string | null;
  createdBy?: { id?: string | number | null } | null;
};

export let mapBoardItem = (item: MiroBoardItem) => ({
  itemId: item.id,
  itemType: item.type,
  content: item.data?.content ?? undefined,
  title: item.data?.title ?? undefined,
  position: item.position
    ? {
        x: item.position.x ?? undefined,
        y: item.position.y ?? undefined
      }
    : undefined,
  geometry: item.geometry
    ? {
        width: item.geometry.width ?? undefined,
        height: item.geometry.height ?? undefined,
        rotation: item.geometry.rotation ?? undefined
      }
    : undefined,
  parentId: item.parent?.id ?? undefined,
  createdAt: item.createdAt ?? undefined,
  modifiedAt: item.modifiedAt ?? undefined,
  createdBy: item.createdBy?.id?.toString()
});
