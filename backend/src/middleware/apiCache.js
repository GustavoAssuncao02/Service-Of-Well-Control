import crypto from 'node:crypto';
import { env } from '../config/env.js';

const apiCacheStore = new Map();

function hashValue(value) {
  if (!value) return 'anonymous';
  return crypto.createHash('sha256').update(value).digest('base64url');
}

function isCacheableMethod(method) {
  return method === 'GET';
}

function isMutatingMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

function shouldSkipPath(pathname) {
  const normalizedPath = pathname.split('?')[0];
  return [
    '/api/health',
    '/api/drive/files',
    '/api/auth/register/lookup',
    '/api/public/evaluations/validate'
  ].some((prefix) => normalizedPath.startsWith(prefix));
}

function cacheKey(req) {
  return [
    req.method,
    req.originalUrl,
    hashValue(req.headers.authorization || ''),
    req.headers.accept || ''
  ].join('|');
}

function pruneExpiredEntries(now = Date.now()) {
  for (const [key, entry] of apiCacheStore) {
    if (entry.expiresAt <= now) {
      apiCacheStore.delete(key);
    }
  }
}

function enforceCacheLimit() {
  while (apiCacheStore.size > env.apiCacheMaxEntries) {
    const oldestKey = apiCacheStore.keys().next().value;
    apiCacheStore.delete(oldestKey);
  }
}

export function clearApiCache() {
  apiCacheStore.clear();
}

export function apiCache(req, res, next) {
  if (!env.apiCacheEnabled || shouldSkipPath(req.originalUrl)) {
    return next();
  }

  if (isMutatingMethod(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        clearApiCache();
      }
    });
    return next();
  }

  if (!isCacheableMethod(req.method)) {
    return next();
  }

  const requestCacheControl = String(req.headers['cache-control'] || '').toLowerCase();
  if (requestCacheControl.includes('no-cache') || requestCacheControl.includes('no-store')) {
    return next();
  }

  const now = Date.now();
  const key = cacheKey(req);
  const cached = apiCacheStore.get(key);

  if (cached && cached.expiresAt > now) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    return res.status(cached.statusCode).json(cached.body);
  }

  if (cached) {
    apiCacheStore.delete(key);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      pruneExpiredEntries(now);
      apiCacheStore.set(key, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + env.apiCacheTtlMs
      });
      enforceCacheLimit();
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    }

    return originalJson(body);
  };

  return next();
}
