import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const SITE_CONTENT_ROW_ID = 1;

const EMPTY_SITE_CONTENT_PAYLOAD = {
  events: [],
  impact_metrics: [],
  impact_countries: [],
  kits: [],
  workshops: [],
  supporters: [],
  team_members: [],
  curriculum_age_groups: [],
  curriculum_pages: [],
};

const canonicalizePayload = (value) => {
  if (Array.isArray(value)) {
    return value.map(canonicalizePayload);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((nextValue, key) => {
        nextValue[key] = canonicalizePayload(value[key]);
        return nextValue;
      }, {});
  }

  return value;
};

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {};
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((envMap, line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        return envMap;
      }

      const separatorIndex = trimmedLine.indexOf("=");
      if (separatorIndex <= 0) {
        return envMap;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      let value = trimmedLine.slice(separatorIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      envMap[key] = value;
      return envMap;
    }, {});
};

const envFiles = [
  resolve(".env"),
  resolve(".env.local"),
  resolve(".env.production"),
  resolve(".env.production.local"),
].map(parseEnvFile);

const resolveEnvValue = (key) => {
  if (process.env[key]) {
    return process.env[key];
  }

  for (const envMap of envFiles) {
    if (envMap[key]) {
      return envMap[key];
    }
  }

  return "";
};

export const getSiteContentSourceConfig = () => {
  const supabaseUrl = resolveEnvValue("VITE_SUPABASE_URL");
  const supabaseAnonKey = resolveEnvValue("VITE_SUPABASE_ANON_KEY");

  return {
    supabaseUrl,
    supabaseAnonKey,
    available: Boolean(supabaseUrl && supabaseAnonKey),
  };
};

export const getEmptySiteContentPayload = () =>
  JSON.parse(JSON.stringify(EMPTY_SITE_CONTENT_PAYLOAD));

export const fetchLiveSiteContentState = async () => {
  const { supabaseUrl, supabaseAnonKey, available } = getSiteContentSourceConfig();

  if (!available) {
    return {
      payload: getEmptySiteContentPayload(),
      updatedAt: null,
    };
  }

  const requestUrl = new URL("/rest/v1/site_content_state", supabaseUrl);
  requestUrl.searchParams.set("select", "payload,updated_at");
  requestUrl.searchParams.set("id", `eq.${SITE_CONTENT_ROW_ID}`);

  const response = await fetch(requestUrl, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch site content snapshot: ${response.status} ${response.statusText}`);
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : undefined;
  const payload = row?.payload;

  if (!payload || typeof payload !== "object") {
    throw new Error("Supabase returned an invalid site content payload.");
  }

  return {
    payload,
    updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
  };
};

export const fetchLiveSiteContentPayload = async () => {
  const state = await fetchLiveSiteContentState();
  return state.payload;
};

export const hashSiteContentPayload = async (payload) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(JSON.stringify(canonicalizePayload(payload))).digest("hex");
};
