import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Location alternatives and optional contact branches must stay object-shaped.
describeMcpCompatibleToolSchemas('API Ninjas tool input schemas', provider.actions);
