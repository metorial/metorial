import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Consolidated field, webhook, and link actions must retain object-root inputs.
describeMcpCompatibleToolSchemas('NocoDB tool input schemas', provider.actions);
