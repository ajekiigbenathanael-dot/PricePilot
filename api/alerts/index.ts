/**
 * GET /api/alerts
 *
 * Returns the current user's price alerts, joined with the product title/image
 * so the frontend can render them without a second fetch.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { errMessage } from '../_lib/http';

function parseCookie(cookie: string, name: string): string | null {
  const parts = cookie.split(';').map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return null;
}

interface AlertDoc {
  _id: string;
  user_id: string;
  product_id: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
}

interface ProductDoc {
  _id: string;
  title: string;
  image_url: string | null;
  lowest_price: number;
}

async function getUserId(req: VercelRequest, res: VercelResponse) {
  const cookie = typeof req.headers.cookie === 'string' ? req.headers.cookie : '';
  const sessionToken = parseCookie(cookie, 'session');
  if (!sessionToken) {
    return { error: res.status(401).json({ error: 'Not authenticated.' }) };
  }
  const db = await getDb();
  const sessions = db.collection<{ user_id: string; expires_at: string }>('sessions');
  const session = await sessions.findOne({ _id: sessionToken } as Record<string, unknown>);
  if (!session) return { error: res.status(401).json({ error: 'Not authenticated.' }) };
  if (new Date(session.expires_at) < new Date()) {
    await sessions.deleteOne({ _id: sessionToken } as Record<string, unknown>);
    return { error: res.status(401).json({ error: 'Session expired.' }) };
  }
  return { db, userId: session.user_id };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const sessionResult = await getUserId(req, res);
    if ('error' in sessionResult) return sessionResult.error;
    const { db, userId } = sessionResult as { db: ReturnType<typeof getDb> extends Promise<infer D> ? D : never; userId: string };

    try {
      const alerts = db.collection<AlertDoc>('price_alerts');
      const userAlerts = await alerts.find({ user_id: userId }).toArray();

      if (userAlerts.length === 0) return res.status(200).json([]);

      const products = db.collection<ProductDoc>('products');
      const productIds = userAlerts.map((a) => a.product_id);
      const docs = await products.find({ _id: { $in: productIds } as Record<string, unknown> }).toArray();
      const productMap = new Map(docs.map((d) => [d._id, d]));

      return res.status(200).json(
        userAlerts.map((alert) => {
          const product = productMap.get(alert.product_id);
          return {
            id: alert._id,
            product_id: alert.product_id,
            target_price: alert.target_price,
            is_active: alert.is_active,
            created_at: alert.created_at,
            product: product
              ? {
                  id: product._id,
                  title: product.title,
                  image_url: product.image_url,
                  lowest_price: product.lowest_price,
                }
              : null,
          };
        }),
      );
    } catch (e) {
      return res.status(500).json({ error: `Failed to load alerts: ${errMessage(e)}` });
    }
  }

  if (req.method === 'POST') {
    const body = req.body;
    const productId =
      body && typeof body === 'object' && 'productId' in body
        ? String((body as Record<string, unknown>).productId ?? '').trim()
        : '';
    const targetPrice =
      body && typeof body === 'object' && 'target_price' in body
        ? Number((body as Record<string, unknown>).target_price)
        : NaN;

    if (!productId) return res.status(400).json({ error: 'A productId is required.' });
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      return res.status(400).json({ error: 'A valid target_price is required.' });
    }

    const sessionResult = await getUserId(req, res);
    if ('error' in sessionResult) return sessionResult.error;
    const { db, userId } = sessionResult as { db: ReturnType<typeof getDb> extends Promise<infer D> ? D : never; userId: string };

    try {
    const alertsCol = db.collection<AlertDoc>('price_alerts');
    const existing = await alertsCol.findOne({
      user_id: userId,
      product_id: productId,
      is_active: true,
    } as Record<string, unknown>);

    if (existing) {
      await alertsCol.updateOne(
        { _id: existing._id },
        { $set: { target_price: targetPrice, created_at: new Date().toISOString() } },
      );
      return res.status(200).json({ id: existing._id, product_id: productId, target_price: targetPrice, is_active: true });
    }

    const alert: AlertDoc = {
      _id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      user_id: userId,
      product_id: productId,
      target_price: targetPrice,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    await alertsCol.insertOne(alert);

      return res.status(201).json({
        id: alert._id,
        product_id: alert.product_id,
        target_price: alert.target_price,
        is_active: alert.is_active,
      });
    } catch (e) {
      return res.status(500).json({ error: `Failed to create alert: ${errMessage(e)}` });
    }
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
