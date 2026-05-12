import { api } from '../api/client.js';
import { readSessionCache, writeSessionCache } from '../utils/sessionCache.js';

export const COURSES_CLASSES_CACHE_MAX_AGE = 10 * 60 * 1000;
export const COURSES_CLASSES_REVALIDATE_AFTER = 30 * 1000;

export const coursesClassesResourceKeys = [
  'courses',
  'classifications',
  'classes',
  'students',
  'instructors',
  'locations',
  'onlineRooms',
  'classModalities'
];

export const emptyCoursesClassesData = Object.freeze({
  courses: [],
  classifications: [],
  classes: [],
  students: [],
  instructors: [],
  locations: [],
  onlineRooms: [],
  classModalities: []
});

const resourceEndpoints = {
  courses: '/courses',
  classifications: '/course-classifications',
  classes: '/classes',
  students: '/students',
  instructors: '/instructors',
  locations: '/locations',
  onlineRooms: '/online-rooms',
  classModalities: '/class-modalities'
};

let fullRefreshPromise = null;

function getCurrentUserId() {
  if (typeof window === 'undefined') return 'anonymous';

  try {
    const user = JSON.parse(window.localStorage.getItem('swc_user') || 'null');
    return user?.id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function getCacheKey() {
  return `courses-classes:${getCurrentUserId()}:v1`;
}

export function normalizeCoursesClassesData(data = {}) {
  return coursesClassesResourceKeys.reduce((acc, key) => {
    acc[key] = Array.isArray(data[key]) ? data[key] : [];
    return acc;
  }, {});
}

export function readCoursesClassesCache(options = {}) {
  const entry = readSessionCache(getCacheKey(), {
    maxAge: COURSES_CLASSES_CACHE_MAX_AGE,
    ...options
  });

  if (!entry) return null;

  return {
    ...entry,
    data: normalizeCoursesClassesData(entry.data)
  };
}

export function writeCoursesClassesCache(data) {
  return writeSessionCache(getCacheKey(), normalizeCoursesClassesData(data));
}

async function fetchResource(key) {
  const endpoint = resourceEndpoints[key];
  if (!endpoint) {
    throw new Error(`Recurso desconhecido: ${key}`);
  }

  const { data } = await api.get(endpoint);
  return [key, Array.isArray(data) ? data : []];
}

export async function fetchCoursesClassesResources(keys = coursesClassesResourceKeys) {
  const uniqueKeys = [...new Set(keys)];
  const entries = await Promise.all(uniqueKeys.map(fetchResource));
  return Object.fromEntries(entries);
}

export async function refreshCoursesClassesCache(keys = coursesClassesResourceKeys, baseData = emptyCoursesClassesData, { persist = true } = {}) {
  const partialData = await fetchCoursesClassesResources(keys);
  const nextData = normalizeCoursesClassesData({ ...baseData, ...partialData });
  if (persist) {
    writeCoursesClassesCache(nextData);
  }
  return nextData;
}

export function shouldRevalidateCoursesClassesCache(entry) {
  if (!entry) return true;
  return Date.now() - entry.savedAt > COURSES_CLASSES_REVALIDATE_AFTER;
}

export async function warmCoursesClassesCache() {
  const freshCache = readCoursesClassesCache({ maxAge: COURSES_CLASSES_REVALIDATE_AFTER });
  if (freshCache) return freshCache.data;

  if (!fullRefreshPromise) {
    const cached = readCoursesClassesCache();
    fullRefreshPromise = refreshCoursesClassesCache(coursesClassesResourceKeys, cached?.data || emptyCoursesClassesData).finally(() => {
      fullRefreshPromise = null;
    });
  }

  return fullRefreshPromise;
}
