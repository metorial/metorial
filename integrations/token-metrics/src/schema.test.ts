import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Branch-selecting inputs must remain top-level JSON Schema objects.
describeMcpCompatibleToolSchemas('Token Metrics tool input schemas', provider.actions);
