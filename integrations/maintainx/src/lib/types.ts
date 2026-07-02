export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE';

export type WorkOrderPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export type WorkOrderType = 'REACTIVE' | 'PREVENTIVE';

export type AssetStatus = 'ONLINE' | 'OFFLINE' | 'IGNORE';

export type DowntimeType = 'PLANNED' | 'UNPLANNED';

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<_T> {
  nextCursor?: string | null;
  [key: string]: any;
}

export interface WorkOrder {
  id: number;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  workOrderType?: WorkOrderType;
  assignees?: any[];
  asset?: any;
  location?: any;
  categories?: any[];
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Asset {
  id: number;
  name: string;
  description?: string;
  barcode?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  locationId?: number;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Part {
  id: number;
  name: string;
  description?: string;
  quantity?: number;
  unitCost?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Team {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface PurchaseOrder {
  id: number;
  title?: string;
  status?: string;
  vendorId?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Meter {
  id: number;
  name: string;
  assetId?: number;
  units?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface MeterReading {
  id: number;
  meterId: number;
  value: number;
  createdAt: string;
  [key: string]: any;
}

export interface WorkRequest {
  id: number;
  title: string;
  description?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface Category {
  id: number;
  name: string;
  [key: string]: any;
}

export interface Conversation {
  id: number;
  name?: string;
  [key: string]: any;
}
