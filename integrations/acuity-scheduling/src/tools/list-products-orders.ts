import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve all products and packages available in the online store.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.number().describe('Product ID'),
            name: z.string().describe('Product name'),
            description: z.string().optional().describe('Product description'),
            price: z.string().optional().describe('Product price'),
            type: z.string().optional().describe('Product type')
          })
        )
        .describe('List of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listProducts();

    let products = (results as any[]).map((p: any) => ({
      productId: p.id,
      name: p.name || '',
      description: p.description || undefined,
      price: p.price || undefined,
      type: p.type || undefined
    }));

    return {
      output: { products },
      message: `Found **${products.length}** product(s).`
    };
  })
  .build();

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve all orders for packages, gift certificates, and subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.number().describe('Order ID'),
            status: z.string().optional().describe('Order status'),
            total: z.string().optional().describe('Order total'),
            title: z.string().optional().describe('Order title'),
            email: z.string().optional().describe('Customer email'),
            time: z.string().optional().describe('Order time')
          })
        )
        .describe('List of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listOrders();

    let orders = (results as any[]).map((o: any) => ({
      orderId: o.id,
      status: o.status || undefined,
      total: o.total || undefined,
      title: o.title || undefined,
      email: o.email || undefined,
      time: o.time || undefined
    }));

    return {
      output: { orders },
      message: `Found **${orders.length}** order(s).`
    };
  })
  .build();
