import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Query parameters have nested scalar variants; every tool must retain an object root.
describeMcpCompatibleToolSchemas('InfluxDB Cloud tool input schemas', provider.actions);
