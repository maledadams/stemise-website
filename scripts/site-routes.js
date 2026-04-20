import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const curriculumContentPath = path.resolve(__dirname, "../src/lib/curriculum-content.ts");
const appRoutesPath = path.resolve(__dirname, "../src/App.tsx");

const defaultRouteMeta = { changefreq: "weekly", priority: "0.7" };
const excludedStaticRoutes = new Set(["/admin"]);
const routeMetaOverrides = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/events": { changefreq: "weekly", priority: "0.85" },
  "/kits": { changefreq: "weekly", priority: "0.9" },
  "/curriculum": { changefreq: "weekly", priority: "0.9" },
  "/get-involved": { changefreq: "weekly", priority: "0.8" },
  "/about": { changefreq: "monthly", priority: "0.7" },
  "/contact": { changefreq: "monthly", priority: "0.6" },
};

const ageRouteMeta = { changefreq: "weekly", priority: "0.85" };
const curriculumRouteMeta = { changefreq: "weekly", priority: "0.85" };
let liveCurriculumRouteCachePromise;

const extractSlugsFromExport = (source, exportName) => {
  const exportStart = source.indexOf(`export const ${exportName}`);
  if (exportStart === -1) {
    throw new Error(`Could not find export "${exportName}" in curriculum data.`);
  }

  const arrayStart = source.indexOf("[", exportStart);
  const arrayEnd = source.indexOf("];", arrayStart);
  if (arrayStart === -1 || arrayEnd === -1) {
    throw new Error(`Could not parse array for export "${exportName}".`);
  }

  const exportBlock = source.slice(arrayStart, arrayEnd);
  return [...exportBlock.matchAll(/slug:\s*"([^"]+)"/g)].map((match) => match[1]);
};

const readCurriculumSource = () => fs.readFileSync(curriculumContentPath, "utf8");
const readAppSource = () => fs.readFileSync(appRoutesPath, "utf8");

const normalizeSlugList = (values) =>
  [...new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()))];

const fetchLiveCurriculumRoutes = async () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/site_content_state?select=payload&id=eq.1&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const rows = await response.json();
    const payload = rows?.[0]?.payload ?? {};

    return {
      ageSlugs: normalizeSlugList(payload.curriculum_age_groups?.map((group) => group?.slug)),
      entrySlugs: normalizeSlugList(payload.curriculum_pages?.map((page) => page?.slug)),
    };
  } catch {
    return null;
  }
};

const getLiveCurriculumRoutes = () => {
  liveCurriculumRouteCachePromise ??= fetchLiveCurriculumRoutes();
  return liveCurriculumRouteCachePromise;
};

export const getStaticAppRoutes = () => {
  const source = readAppSource();
  const routeMatches = [...source.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([^}]+)\}\s*\/>/g)];

  return routeMatches
    .map((match) => ({
      path: match[1],
      element: match[2],
    }))
    .filter((route) => route.path !== "*" && !route.path.includes(":"))
    .filter((route) => !route.element.trim().startsWith("Navigate"))
    .filter((route) => !excludedStaticRoutes.has(route.path))
    .map((route) => ({
      path: route.path,
      ...(routeMetaOverrides[route.path] ?? defaultRouteMeta),
    }));
};

export const getCurriculumAgeRoutes = async () => {
  const source = readCurriculumSource();
  const fallbackAgeSlugs = extractSlugsFromExport(source, "curriculumAgeGroupsFallback");
  const liveRoutes = await getLiveCurriculumRoutes();
  const ageSlugs = liveRoutes?.ageSlugs?.length ? liveRoutes.ageSlugs : fallbackAgeSlugs;

  return ageSlugs.map((slug) => ({
    path: `/curriculum/age/${slug}`,
    ...ageRouteMeta,
  }));
};

export const getCurriculumEntryRoutes = async () => {
  const source = readCurriculumSource();
  const fallbackEntrySlugs = extractSlugsFromExport(source, "curriculumPagesFallback");
  const liveRoutes = await getLiveCurriculumRoutes();
  const entrySlugs = liveRoutes?.entrySlugs?.length ? liveRoutes.entrySlugs : fallbackEntrySlugs;

  return entrySlugs.map((slug) => ({
    path: `/curriculum/${slug}`,
    ...curriculumRouteMeta,
  }));
};

export const getSitemapEntries = async () => [
  ...getStaticAppRoutes(),
  ...(await getCurriculumAgeRoutes()),
  ...(await getCurriculumEntryRoutes()),
];

export const getPrerenderRoutes = async () => [
  ...new Set([
    ...(await getSitemapEntries()).map((entry) => entry.path),
    "/admin",
  ]),
];
