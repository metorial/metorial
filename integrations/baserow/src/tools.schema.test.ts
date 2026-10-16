import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { provider } from './index';

// Consolidated table/view/field operations must keep object-root input schemas.
describeMcpCompatibleToolSchemas('Baserow tool input schemas', provider.actions);
