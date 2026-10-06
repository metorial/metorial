import type { z } from 'zod';
import type {
  connectionSchema,
  destinationSchema,
  jobSchema,
  permissionSchema,
  sourceSchema,
  streamConfigurationSchema,
  streamPropertiesSchema,
  tagSchema,
  workspaceSchema
} from './models';
export interface PaginatedResponse<T> {
  previous?: string;
  next?: string;
  data: T[];
}
export type Source = z.output<typeof sourceSchema>;
export type Destination = z.output<typeof destinationSchema>;
export type Connection = z.output<typeof connectionSchema>;
export type Job = z.output<typeof jobSchema>;
export type Workspace = z.output<typeof workspaceSchema>;
export type Permission = z.output<typeof permissionSchema>;
export type StreamConfiguration = z.output<typeof streamConfigurationSchema>;
export type StreamProperties = z.output<typeof streamPropertiesSchema>;
export type Tag = z.output<typeof tagSchema>;
