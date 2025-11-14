import type { Request, Response } from 'express';
import { Router } from 'express';
import AppDataSource from '../db/data-source';
import { Incident } from '../db/entities/Incident';

const router = Router();

// In-memory demo data (used when DB is not initialized)
type Demo = { id: string; type: string; severity: string; status: string; lat: number; lon: number; created_at: Date };
const demoItems: Demo[] = [
  { id: 'd-001', type: 'theft', severity: 'medium', status: 'open', lat: 19.076, lon: 72.8777, created_at: new Date(Date.now() - 15 * 60 * 1000) },
  { id: 'd-002', type: 'sos', severity: 'high', status: 'open', lat: 37.7749, lon: -122.4194, created_at: new Date(Date.now() - 40 * 60 * 1000) },
  { id: 'd-003', type: 'assault', severity: 'critical', status: 'triaged', lat: 34.0522, lon: -118.2437, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'd-004', type: 'fall', severity: 'low', status: 'closed', lat: 35.6762, lon: 139.6503, created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000) },
  { id: 'd-005', type: 'harassment', severity: 'high', status: 'open', lat: 18.9388, lon: 72.8354, created_at: new Date(Date.now() - 25 * 60 * 1000) },
  { id: 'd-006', type: 'vandalism', severity: 'medium', status: 'triaged', lat: 37.76, lon: -122.45, created_at: new Date(Date.now() - 90 * 60 * 1000) },
  { id: 'd-007', type: 'sos', severity: 'critical', status: 'open', lat: 34.10, lon: -118.20, created_at: new Date(Date.now() - 10 * 60 * 1000) },
  { id: 'd-008', type: 'lost', severity: 'low', status: 'closed', lat: 19.09, lon: 72.90, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000) },
];

function filterAndPageDemo(
  list: Demo[],
  opts: { status: string[]; severity: string[]; createdBefore: Date | null; createdAfter: Date | null; bbox: [number, number, number, number] | null; limit: number },
) {
  let out = list.slice();
  if (opts.status.length) out = out.filter((i) => opts.status.includes(i.status));
  if (opts.severity.length) out = out.filter((i) => opts.severity.includes(i.severity));
  if (opts.createdBefore) out = out.filter((i) => i.created_at < opts.createdBefore!);
  if (opts.createdAfter) out = out.filter((i) => i.created_at >= opts.createdAfter!);
  if (opts.bbox) {
    const [minLon, minLat, maxLon, maxLat] = opts.bbox;
    out = out.filter((i) => i.lon >= minLon && i.lon <= maxLon && i.lat >= minLat && i.lat <= maxLat);
  }
  out.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const items = out.slice(0, opts.limit);
  const last = items[items.length - 1];
  const nextCursor = last ? last.created_at.toISOString() : null;
  return { items, nextCursor };
}


router.get('/', (req: Request, res: Response) => {
  const status = (Array.isArray(req.query.status) ? req.query.status : (req.query.status ? [req.query.status] : [])) as string[];
  const severity = (Array.isArray(req.query.severity) ? req.query.severity : (req.query.severity ? [req.query.severity] : [])) as string[];
  const take = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
  const createdBefore = typeof req.query.created_before === 'string' ? new Date(req.query.created_before) : null;
  const createdAfter = typeof req.query.created_after === 'string' ? new Date(req.query.created_after) : null;
  const bboxStr = typeof req.query.bbox === 'string' ? req.query.bbox : null; // minLon,minLat,maxLon,maxLat
  let bbox: [number, number, number, number] | null = null;
  if (bboxStr) {
    const parts = bboxStr.split(',').map((n) => Number(n.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
      if (minLon <= maxLon && minLat <= maxLat) bbox = [minLon, minLat, maxLon, maxLat];
    }
  }

  // Demo mode if DB is not ready
  if (!AppDataSource.isInitialized) {
    res.set('x-demo-mode', 'true');
    const { items, nextCursor } = filterAndPageDemo(demoItems, {
      status,
      severity,
      createdBefore,
      createdAfter,
      bbox,
      limit: take,
    });
    return res.json({
      items: items.map((i) => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        status: i.status,
        coords: [i.lon, i.lat] as [number, number],
        createdAt: i.created_at.toISOString(),
      })),
      nextCursor,
    });
  }

  const qb = AppDataSource.getRepository(Incident)
    .createQueryBuilder('i')
    .orderBy('i.created_at', 'DESC')
    .limit(take);

  if (status.length) qb.andWhere('i.status = ANY(:status)', { status });
  if (severity.length) qb.andWhere('i.severity = ANY(:severity)', { severity });
  if (createdBefore && !isNaN(createdBefore.getTime())) qb.andWhere('i.created_at < :cursor', { cursor: createdBefore.toISOString() });
  if (createdAfter && !isNaN(createdAfter.getTime())) qb.andWhere('i.created_at >= :after', { after: createdAfter.toISOString() });
  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    qb.andWhere('i.lon BETWEEN :minLon AND :maxLon AND i.lat BETWEEN :minLat AND :maxLat', {
      minLon,
      maxLon,
      minLat,
      maxLat,
    });
  }

  qb
    .getMany()
    .then((items: Incident[]) => {
      const last = items[items.length - 1];
      const nextCursor = last ? last.created_at.toISOString() : null;
      return res.json({
        items: items.map((i: Incident) => ({
          id: i.id,
          type: i.type,
          severity: i.severity,
          status: i.status,
          coords: [i.lon, i.lat] as [number, number],
          createdAt: i.created_at.toISOString(),
        })),
        nextCursor,
      });
    })
    .catch((_e: unknown) => {
      // Fallback to demo mode if DB query fails (e.g., table missing during dev)
      res.set('x-demo-mode', 'true');
      const { items, nextCursor } = filterAndPageDemo(demoItems, {
        status,
        severity,
        createdBefore,
        createdAfter,
        bbox,
        limit: take,
      });
      return res.json({
        items: items.map((i) => ({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() })),
        nextCursor,
      });
    });
});

router.get('/export', (req: Request, res: Response) => {
  const status = (Array.isArray(req.query.status) ? req.query.status : (req.query.status ? [req.query.status] : [])) as string[];
  const severity = (Array.isArray(req.query.severity) ? req.query.severity : (req.query.severity ? [req.query.severity] : [])) as string[];
  const take = Math.min(Math.max(Number(req.query.limit ?? 500), 1), 1000);
  const createdBefore = typeof req.query.created_before === 'string' ? new Date(req.query.created_before) : null;
  const createdAfter = typeof req.query.created_after === 'string' ? new Date(req.query.created_after) : null;
  const bboxStr = typeof req.query.bbox === 'string' ? req.query.bbox : null; // minLon,minLat,maxLon,maxLat
  let bbox: [number, number, number, number] | null = null;
  if (bboxStr) {
    const parts = bboxStr.split(',').map((n) => Number(n.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
      if (minLon <= maxLon && minLat <= maxLat) bbox = [minLon, minLat, maxLon, maxLat];
    }
  }

  // Demo mode if DB is not ready
  if (!AppDataSource.isInitialized) {
    res.set('x-demo-mode', 'true');
    const { items } = filterAndPageDemo(demoItems, {
      status,
      severity,
      createdBefore,
      createdAfter,
      bbox,
      limit: take,
    });
    const header = ['id', 'type', 'severity', 'status', 'lon', 'lat', 'createdAt'];
    const rows = items.map((i) => [i.id, i.type, i.severity, i.status, String(i.lon), String(i.lat), i.created_at.toISOString()]);
    const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v);
    const csv = [header.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="incidents.csv"');
    return res.status(200).send(csv);
  }

  const qb = AppDataSource.getRepository(Incident)
    .createQueryBuilder('i')
    .orderBy('i.created_at', 'DESC')
    .limit(take);

  if (status.length) qb.andWhere('i.status = ANY(:status)', { status });
  if (severity.length) qb.andWhere('i.severity = ANY(:severity)', { severity });
  if (createdBefore && !isNaN(createdBefore.getTime())) qb.andWhere('i.created_at < :cursor', { cursor: createdBefore.toISOString() });
  if (createdAfter && !isNaN(createdAfter.getTime())) qb.andWhere('i.created_at >= :after', { after: createdAfter.toISOString() });
  if (bbox) {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    qb.andWhere('i.lon BETWEEN :minLon AND :maxLon AND i.lat BETWEEN :minLat AND :maxLat', {
      minLon,
      maxLon,
      minLat,
      maxLat,
    });
  }

  qb
    .getMany()
    .then((items: Incident[]) => {
      const header = ['id', 'type', 'severity', 'status', 'lon', 'lat', 'createdAt'];
      const rows = items.map((i) => [i.id, i.type, i.severity, i.status, String(i.lon), String(i.lat), i.created_at.toISOString()]);
      const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v);
      const csv = [header.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="incidents.csv"');
      return res.status(200).send(csv);
    })
    .catch((_e: unknown) => {
      // Fallback to demo CSV
      res.set('x-demo-mode', 'true');
      const { items } = filterAndPageDemo(demoItems, { status, severity, createdBefore, createdAfter, bbox, limit: take });
      const header = ['id', 'type', 'severity', 'status', 'lon', 'lat', 'createdAt'];
      const rows = items.map((i) => [i.id, i.type, i.severity, i.status, String(i.lon), String(i.lat), i.created_at.toISOString()]);
      const escape = (v: string) => (v.includes(',') || v.includes('"') || v.includes('\n') ? '"' + v.replace(/"/g, '""') + '"' : v);
      const csv = [header.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="incidents.csv"');
      return res.status(200).send(csv);
    });
});

// Lightweight stats endpoint: returns counts by status and severity using the same filters
router.get('/stats', async (req: Request, res: Response) => {
  const status = (Array.isArray(req.query.status) ? req.query.status : (req.query.status ? [req.query.status] : [])) as string[];
  const severity = (Array.isArray(req.query.severity) ? req.query.severity : (req.query.severity ? [req.query.severity] : [])) as string[];
  const createdBefore = typeof req.query.created_before === 'string' ? new Date(req.query.created_before) : null;
  const createdAfter = typeof req.query.created_after === 'string' ? new Date(req.query.created_after) : null;
  const bboxStr = typeof req.query.bbox === 'string' ? req.query.bbox : null; // minLon,minLat,maxLon,maxLat
  let bbox: [number, number, number, number] | null = null;
  if (bboxStr) {
    const parts = bboxStr.split(',').map((n) => Number(n.trim()));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
      if (minLon <= maxLon && minLat <= maxLat) bbox = [minLon, minLat, maxLon, maxLat];
    }
  }

  // Demo mode
  if (!AppDataSource.isInitialized) {
    res.set('x-demo-mode', 'true');
    const { items } = filterAndPageDemo(demoItems, { status, severity, createdBefore, createdAfter, bbox, limit: 1000 });
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const i of items) {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    }
    return res.json({ total: items.length, byStatus, bySeverity });
  }

  try {
    // Build where conditions similar to list endpoint
    const repo = AppDataSource.getRepository(Incident);
    const qb = repo.createQueryBuilder('i');
    if (status.length) qb.andWhere('i.status = ANY(:status)', { status });
    if (severity.length) qb.andWhere('i.severity = ANY(:severity)', { severity });
    if (createdBefore && !isNaN(createdBefore.getTime())) qb.andWhere('i.created_at < :cursor', { cursor: createdBefore.toISOString() });
    if (createdAfter && !isNaN(createdAfter.getTime())) qb.andWhere('i.created_at >= :after', { after: createdAfter.toISOString() });
    if (bbox) {
      const [minLon, minLat, maxLon, maxLat] = bbox;
      qb.andWhere('i.lon BETWEEN :minLon AND :maxLon AND i.lat BETWEEN :minLat AND :maxLat', {
        minLon,
        maxLon,
        minLat,
        maxLat,
      });
    }

    // Clone query builder for two groupings
    const byStatusRows = await qb.clone().select('i.status', 'status').addSelect('COUNT(*)', 'cnt').groupBy('i.status').getRawMany();
    const bySeverityRows = await qb.clone().select('i.severity', 'severity').addSelect('COUNT(*)', 'cnt').groupBy('i.severity').getRawMany();
    const totalRow = await qb.clone().select('COUNT(*)', 'cnt').getRawOne();

    const byStatus: Record<string, number> = {};
    for (const r of byStatusRows as any[]) byStatus[r.status] = Number(r.cnt);
    const bySeverity: Record<string, number> = {};
    for (const r of bySeverityRows as any[]) bySeverity[r.severity] = Number(r.cnt);
    const total = Number((totalRow as any)?.cnt ?? 0);
    return res.json({ total, byStatus, bySeverity });
  } catch (_e) {
    // Fallback to demo on DB errors
    res.set('x-demo-mode', 'true');
    const { items } = filterAndPageDemo(demoItems, { status, severity, createdBefore, createdAfter, bbox, limit: 1000 });
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const i of items) {
      byStatus[i.status] = (byStatus[i.status] || 0) + 1;
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    }
    return res.json({ total: items.length, byStatus, bySeverity });
  }
});

// Get single incident by ID
router.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!AppDataSource.isInitialized) {
    res.set('x-demo-mode', 'true');
    const i = demoItems.find((d) => d.id === id);
    if (!i) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
    return res.json({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() });
  }
  try {
    const repo = AppDataSource.getRepository(Incident);
    const i = await repo.findOneBy({ id });
    if (!i) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
    return res.json({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() });
  } catch (_e) {
    // Fallback to demo on DB error
    res.set('x-demo-mode', 'true');
    const i = demoItems.find((d) => d.id === id);
    if (!i) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
    return res.json({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() });
  }
});

router.post('/', (req: Request, res: Response) => {
  const { type, severity, description, location } = req.body ?? {};
  if (!type || !severity || location?.lat === undefined || location?.lon === undefined) {
    return res.status(400).json({
      type: 'https://httpstatuses.com/400',
      title: 'Bad Request',
      status: 400,
      detail: 'Missing required fields',
      code: 'INC_400_BAD_REQUEST',
    });
  }
  // Demo mode create
  if (!AppDataSource.isInitialized) {
    res.set('x-demo-mode', 'true');
    const now = new Date();
    const id = `d-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
    demoItems.unshift({ id, type, severity, status: 'open', lat: Number(location.lat), lon: Number(location.lon), created_at: now });
    return res.status(201).json({ id, status: 'open', createdAt: now.toISOString() });
  }

  const repo = AppDataSource.getRepository(Incident);
  const entity = repo.create({
    type,
    severity,
    status: 'open',
    lat: location.lat,
    lon: location.lon,
  });
  repo
    .save(entity)
    .then((saved: Incident) => {
      return res.status(201).json({ id: saved.id, status: saved.status, createdAt: saved.created_at.toISOString() });
    })
    .catch((_e: unknown) => {
      // Fallback to demo create on DB error
      res.set('x-demo-mode', 'true');
      const now = new Date();
      const id = `d-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
      demoItems.unshift({ id, type, severity, status: 'open', lat: Number(location.lat), lon: Number(location.lon), created_at: now });
      return res.status(201).json({ id, status: 'open', createdAt: now.toISOString() });
    });
});

// Update incident (currently supports status only)
router.patch('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { status } = req.body ?? {};
  try {
    const allowed = ['open', 'triaged', 'closed'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'Invalid status', code: 'INC_400_INVALID_STATUS' });
    }

    if (!status) {
      return res.status(400).json({ type: 'about:blank', title: 'Bad Request', status: 400, detail: 'No updatable fields provided', code: 'INC_400_NO_FIELDS' });
    }

    // Demo mode
    if (!AppDataSource.isInitialized) {
      res.set('x-demo-mode', 'true');
      const idx = demoItems.findIndex((d) => d.id === id);
      if (idx === -1) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
      demoItems[idx].status = status;
      const i = demoItems[idx];
      return res.json({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() });
    }

    const repo = AppDataSource.getRepository(Incident);
    const entity = await repo.findOneBy({ id });
    if (!entity) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
    entity.status = status;
    const saved = await repo.save(entity);
    return res.json({
      id: saved.id,
      type: saved.type,
      severity: saved.severity,
      status: saved.status,
      coords: [saved.lon, saved.lat] as [number, number],
      createdAt: saved.created_at.toISOString(),
    });
  } catch (_e: unknown) {
    // Fallback to demo patch on DB error
    res.set('x-demo-mode', 'true');
    const idx = demoItems.findIndex((d) => d.id === id);
    if (idx === -1) return res.status(404).json({ type: 'about:blank', title: 'Not Found', status: 404, detail: 'Incident not found', code: 'INC_404_NOT_FOUND' });
    demoItems[idx].status = status;
    const i = demoItems[idx];
    return res.json({ id: i.id, type: i.type, severity: i.severity, status: i.status, coords: [i.lon, i.lat] as [number, number], createdAt: i.created_at.toISOString() });
  }
});

export default router;

// Demo-only utilities (not mounted in production UI). Keep at end of file.
router.post('/_bulk_demo', (req: Request, res: Response) => {
  // Only allowed when in demo mode (DB not initialized)
  if (AppDataSource.isInitialized) {
    return res.status(501).json({ title: 'Not Implemented', detail: 'Bulk demo only in demo mode' });
  }
  res.set('x-demo-mode', 'true');
  const count = Math.min(Math.max(Number(req.body?.count ?? 5), 1), 50);
  const types = ['disturbance','accident','theft','sos','hazard','assault','lost','vandalism'];
  const severities = ['low','medium','high','critical'];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const id = `d-${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)] as Demo['severity'];
    const status: Demo['status'] = ['open','triaged','closed'][Math.floor(Math.random()*3)] as Demo['status'];
    const lat = Math.max(-85, Math.min(85, (Math.random() * 170) - 85));
    const lon = (Math.random() * 360) - 180;
    const created_at = new Date(now - Math.floor(Math.random() * 6 * 60 * 60 * 1000));
    demoItems.unshift({ id, type, severity, status, lat, lon, created_at });
  }
  return res.status(201).json({ added: count });
});
