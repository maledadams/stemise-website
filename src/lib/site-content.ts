import { useQuery } from "@tanstack/react-query";
import {
  homeImpactMetrics,
  homeImpactCountries,
  kitCatalog,
  partnerLogos,
  siteEvents,
  teamMembers,
  type SiteEvent,
  type EventOrganization,
  type HomeImpactCountry,
  type HomeImpactMetric,
  type KitCatalogItem,
  type SupporterLogo,
  type TeamMember,
} from "@/lib/site-data";
import {
  curriculumAgeGroupsFallback,
  curriculumPagesFallback,
  type CurriculumAgeGroupContent,
  type CurriculumPage,
} from "@/lib/curriculum-content";
import { SITE_CONTENT_BUILD_SNAPSHOT } from "@/generated/site-content-snapshot";
import { ensureActiveSupabaseSession, isSupabaseConfigured, supabase } from "@/lib/supabase";

export type WorkshopItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  registrationLink?: string;
};

export type SiteContentKey =
  | "events"
  | "impact_metrics"
  | "impact_countries"
  | "kits"
  | "workshops"
  | "supporters"
  | "home_professionals"
  | "team_members"
  | "curriculum_age_groups"
  | "curriculum_pages";

export type SiteContentMap = {
  events: SiteEvent[];
  impact_metrics: HomeImpactMetric[];
  impact_countries: HomeImpactCountry[];
  kits: KitCatalogItem[];
  workshops: WorkshopItem[];
  supporters: SupporterLogo[];
  home_professionals: SupporterLogo[];
  team_members: TeamMember[];
  curriculum_age_groups: CurriculumAgeGroupContent[];
  curriculum_pages: CurriculumPage[];
};

type SiteContentStateRow = {
  id: number;
  payload: Partial<Record<SiteContentKey, unknown>>;
};

type SiteContentStateReadOptions = {
  throwOnError?: boolean;
};

const SITE_CONTENT_ROW_ID = 1;
const SITE_ASSET_PUBLIC_SEGMENT = "/storage/v1/object/public/site-assets/";
const SITE_CONTENT_CACHE_KEY = "stemise:site-content-cache";
const DEV_SITE_CONTENT_SESSION_KEY = "stemise:dev-site-content";
const SITE_CONTENT_STALE_TIME_MS = 60_000;
const SITE_CONTENT_GC_TIME_MS = 10 * 60_000;
const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DEFAULT_MAX_UPLOAD_IMAGE_DIMENSION = 1800;
const DEFAULT_MAX_UPLOAD_IMAGE_BYTES = 1.1 * 1024 * 1024;
const TEAM_MAX_UPLOAD_IMAGE_DIMENSION = 1400;
const TEAM_MAX_UPLOAD_IMAGE_BYTES = 700 * 1024;
const JPEG_UPLOAD_QUALITY = 0.76;
const IMAGE_OPTIMIZATION_TIMEOUT_MS = 12_000;
const STORAGE_UPLOAD_TIMEOUT_MS = 45_000;
const ADMIN_AUTH_ERROR_MESSAGE = "Your admin session is no longer authorized. Open the latest magic link and sign in again.";
const LOCAL_DEV_EDIT_MODE = import.meta.env.DEV;

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizeAdminMutationError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return new Error("The request failed. Please try again.");
  }

  const normalizedMessage = error.message.toLowerCase();
  if (
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("jwt") ||
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("row-level security")
  ) {
    return new Error(ADMIN_AUTH_ERROR_MESSAGE);
  }

  return error;
};

const readCachedSiteContent = (): SiteContentMap | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SITE_CONTENT_CACHE_KEY);
    if (!rawValue) {
      return null;
    }

    return normalizeSiteContentState(JSON.parse(rawValue) as Partial<Record<SiteContentKey, unknown>>);
  } catch {
    return null;
  }
};

export const hasCachedSiteContent = () => Boolean(readCachedSiteContent());

const readDevSessionSiteContent = (): SiteContentMap | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(DEV_SITE_CONTENT_SESSION_KEY);
    if (!rawValue) {
      return null;
    }

    return normalizeSiteContentState(JSON.parse(rawValue) as Partial<Record<SiteContentKey, unknown>>);
  } catch {
    return null;
  }
};

const hasBuildSiteContentSnapshot = () =>
  Boolean(
    SITE_CONTENT_BUILD_SNAPSHOT &&
      typeof SITE_CONTENT_BUILD_SNAPSHOT === "object",
  );

const hasAnySiteContentItems = (payload: Partial<Record<SiteContentKey, unknown>>) =>
  (Object.keys(fallbackSiteContent) as SiteContentKey[]).some((key) => {
    const sectionPayload = payload[key];
    return Array.isArray(sectionPayload) && sectionPayload.length > 0;
  });

const readBuildSiteContentSnapshot = (): SiteContentMap | null => {
  if (!hasBuildSiteContentSnapshot()) {
    return null;
  }

  const snapshotPayload = SITE_CONTENT_BUILD_SNAPSHOT as Partial<Record<SiteContentKey, unknown>>;
  if (!hasAnySiteContentItems(snapshotPayload)) {
    return null;
  }

  return normalizeSiteContentState(
    snapshotPayload,
  );
};

export const hasWarmSiteContent = () => hasBuildSiteContentSnapshot() || hasCachedSiteContent();

const persistCachedSiteContent = (payload: SiteContentMap) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SITE_CONTENT_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures so content reads and saves still work.
  }
};

const persistDevSessionSiteContent = (payload: SiteContentMap) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(DEV_SITE_CONTENT_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // Ignore browser storage failures in local edit mode.
  }
};

const canonicalizeForComparison = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForComparison);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((nextObject, key) => {
        const nextValue = canonicalizeForComparison((value as Record<string, unknown>)[key]);

        if (typeof nextValue !== "undefined") {
          nextObject[key] = nextValue;
        }

        return nextObject;
      }, {});
  }

  return value;
};

const stableSerializeForComparison = (value: unknown) =>
  JSON.stringify(canonicalizeForComparison(value));

const replaceFileExtension = (fileName: string, nextExtension: string) =>
  fileName.replace(/\.[^.]+$/, "") + nextExtension;

const optimizeImageForUpload = async (file: File, folder: string): Promise<File> => {
  if (
    typeof window === "undefined" ||
    typeof createImageBitmap !== "function" ||
    !OPTIMIZABLE_IMAGE_TYPES.has(file.type)
  ) {
    return file;
  }

  const maxDimension =
    folder === "team" ? TEAM_MAX_UPLOAD_IMAGE_DIMENSION : DEFAULT_MAX_UPLOAD_IMAGE_DIMENSION;
  const maxBytes = folder === "team" ? TEAM_MAX_UPLOAD_IMAGE_BYTES : DEFAULT_MAX_UPLOAD_IMAGE_BYTES;

  const optimizationPromise = (async () => {
    let bitmap: ImageBitmap | null = null;

    try {
      bitmap = await createImageBitmap(file);
      const longestSide = Math.max(bitmap.width, bitmap.height);
      const shouldResize = longestSide > maxDimension;
      const shouldCompress = file.size > maxBytes;

      if (!shouldResize && !shouldCompress) {
        return file;
      }

      const scale = shouldResize ? maxDimension / longestSide : 1;
      const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
      const targetHeight = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        return file;
      }

      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

      const nextMimeType =
        folder === "team" || file.type === "image/jpeg" ? "image/jpeg" : "image/png";
      const nextFileName = nextMimeType === "image/jpeg"
        ? replaceFileExtension(file.name, ".jpg")
        : replaceFileExtension(file.name, ".png");

      const optimizedBlob = await new Promise<Blob | null>((resolve) => {
        if (nextMimeType === "image/jpeg") {
          canvas.toBlob(resolve, "image/jpeg", JPEG_UPLOAD_QUALITY);
          return;
        }

        canvas.toBlob(resolve, "image/png");
      });

      if (!optimizedBlob || optimizedBlob.size >= file.size) {
        return file;
      }

      return new File([optimizedBlob], nextFileName, {
        type: optimizedBlob.type || nextMimeType,
        lastModified: file.lastModified,
      });
    } catch {
      return file;
    } finally {
      bitmap?.close();
    }
  })();

  try {
    return await Promise.race([
      optimizationPromise,
      new Promise<File>((resolve) => {
        window.setTimeout(() => resolve(file), IMAGE_OPTIMIZATION_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return file;
  }
};

const fallbackEventAssetMap = new Map(
  siteEvents.map((event) => [
    event.id,
    {
      image: event.image,
      imageAlt: event.imageAlt,
    },
  ]),
);

const fallbackKitAssetMap = new Map(kitCatalog.map((kit) => [kit.id, kit.image]));
const fallbackSupporterAssetMap = new Map(partnerLogos.map((supporter) => [supporter.id, supporter.src]));
const fallbackTeamAssetMap = new Map(teamMembers.map((member) => [member.id, member.photo]));

const getWindowOrigin = () => (typeof window !== "undefined" ? window.location.origin : "");

const tryParseUrl = (value: string) => {
  try {
    return new URL(value, getWindowOrigin() || "http://localhost");
  } catch {
    return null;
  }
};

const isSupabaseStorageUrl = (value: string) => value.includes(SITE_ASSET_PUBLIC_SEGMENT);

const isLikelyBundledAssetReference = (value: string) => {
  if (
    value.startsWith("/assets/") ||
    value.startsWith("assets/") ||
    value.startsWith("/src/assets/") ||
    value.startsWith("src/assets/")
  ) {
    return true;
  }

  const parsed = tryParseUrl(value);
  if (!parsed) {
    return false;
  }

  return parsed.pathname.startsWith("/assets/") || parsed.pathname.startsWith("/src/assets/");
};

const shouldReplaceWithFallbackAsset = (value: string | undefined) => {
  if (!value) {
    return true;
  }

  if (isSupabaseStorageUrl(value)) {
    return false;
  }

  if (isLikelyBundledAssetReference(value)) {
    return true;
  }

  const parsed = tryParseUrl(value);
  if (!parsed) {
    return false;
  }

  const currentOrigin = getWindowOrigin();
  const isLocalDevHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const isBundledAssetPath =
    parsed.pathname.startsWith("/assets/") || parsed.pathname.startsWith("/src/assets/");

  if (isLocalDevHost && isBundledAssetPath) {
    return true;
  }

  if (currentOrigin && parsed.origin !== currentOrigin && isBundledAssetPath) {
    return true;
  }

  return false;
};

const normalizeEventOrganizations = (organizations: EventOrganization[] = []): EventOrganization[] =>
  organizations.map((organization) => ({
    ...organization,
  }));

const normalizeEvents = (events: SiteEvent[]): SiteEvent[] =>
  events.map((event) => {
    const fallbackAsset = fallbackEventAssetMap.get(event.id);
    const shortDescription = event.shortDescription || (event as SiteEvent & { description?: string }).description || "";
    const fullDescription = event.fullDescription || shortDescription;
    const slug = event.slug || event.id || shortDescription.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    return {
      ...event,
      slug,
      accentTheme: event.accentTheme || "blue",
      shortDescription,
      fullDescription,
      featuredOnHome: event.featuredOnHome ?? true,
      image: shouldReplaceWithFallbackAsset(event.image) ? fallbackAsset?.image ?? event.image : event.image,
      imageAlt: event.imageAlt || fallbackAsset?.imageAlt || "",
      sponsors: normalizeEventOrganizations(event.sponsors ?? []),
      professionals: normalizeEventOrganizations(event.professionals ?? []),
    };
  });

const normalizeKits = (kits: KitCatalogItem[]): KitCatalogItem[] =>
  kits.map((kit) => ({
    ...kit,
    image: shouldReplaceWithFallbackAsset(kit.image) ? fallbackKitAssetMap.get(kit.id) ?? kit.image : kit.image,
  }));

const normalizeSupporters = (supporters: SupporterLogo[]): SupporterLogo[] =>
  supporters.map((supporter) => ({
    ...supporter,
    src: shouldReplaceWithFallbackAsset(supporter.src)
      ? fallbackSupporterAssetMap.get(supporter.id) ?? supporter.src
      : supporter.src,
  }));

const normalizeTeamMembers = (members: TeamMember[]): TeamMember[] =>
  members.map((member) => ({
    ...member,
    photo: shouldReplaceWithFallbackAsset(member.photo)
      ? fallbackTeamAssetMap.get(member.id) ?? member.photo
      : member.photo,
  }));

const normalizeCurriculumPages = (pages: CurriculumPage[]): CurriculumPage[] =>
  pages.map((page) => ({
    ...page,
    heroImage: shouldReplaceWithFallbackAsset(page.heroImage) ? "" : page.heroImage,
  }));

const normalizeContentAssets = <K extends SiteContentKey>(
  key: K,
  payload: SiteContentMap[K],
): SiteContentMap[K] => {
  switch (key) {
    case "events":
      return normalizeEvents(payload as SiteEvent[]) as SiteContentMap[K];
    case "kits":
      return normalizeKits(payload as KitCatalogItem[]) as SiteContentMap[K];
    case "supporters":
    case "home_professionals":
      return normalizeSupporters(payload as SupporterLogo[]) as SiteContentMap[K];
    case "team_members":
      return normalizeTeamMembers(payload as TeamMember[]) as SiteContentMap[K];
    case "curriculum_pages":
      return normalizeCurriculumPages(payload as CurriculumPage[]) as SiteContentMap[K];
    default:
      return payload;
  }
};

const fileNameFromAssetUrl = (assetUrl: string, fallbackBaseName: string) => {
  const parsed = tryParseUrl(assetUrl);
  const rawName = parsed?.pathname.split("/").pop() || fallbackBaseName;
  return rawName.includes(".") ? rawName : `${rawName}.png`;
};

const fetchAssetAsFile = async (assetUrl: string, fallbackBaseName: string) => {
  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch asset for sync: ${assetUrl}`);
  }

  const blob = await response.blob();
  return new File([blob], fileNameFromAssetUrl(assetUrl, fallbackBaseName), {
    type: blob.type || "application/octet-stream",
  });
};

const syncAssetUrlToSupabase = async (
  assetUrl: string,
  folder: string,
  fallbackBaseName: string,
  cache: Map<string, string>,
) => {
  if (!assetUrl || isSupabaseStorageUrl(assetUrl) || !isLikelyBundledAssetReference(assetUrl)) {
    return assetUrl;
  }

  if (cache.has(assetUrl)) {
    return cache.get(assetUrl)!;
  }

  const file = await fetchAssetAsFile(assetUrl, fallbackBaseName);
  const publicUrl = await uploadSiteAsset(file, folder);
  cache.set(assetUrl, publicUrl);
  return publicUrl;
};

const syncImageBackedContentToStorage = async <K extends SiteContentKey>(
  key: K,
  payload: SiteContentMap[K],
): Promise<SiteContentMap[K]> => {
  const cache = new Map<string, string>();

  switch (key) {
    case "events":
      return (await Promise.all(
        (payload as SiteEvent[]).map(async (event) => ({
          ...event,
          image: event.image
            ? await syncAssetUrlToSupabase(event.image, "events", event.id || "event-image", cache)
            : event.image,
          sponsors: await Promise.all(
            (event.sponsors ?? []).map(async (sponsor) => ({
              ...sponsor,
              logo: sponsor.logo
                ? await syncAssetUrlToSupabase(
                    sponsor.logo,
                    "events/sponsors",
                    sponsor.id || `${event.id}-sponsor`,
                    cache,
                  )
                : sponsor.logo,
            })),
          ),
          professionals: await Promise.all(
            (event.professionals ?? []).map(async (professional) => ({
              ...professional,
              logo: professional.logo
                ? await syncAssetUrlToSupabase(
                    professional.logo,
                    "events/professionals",
                    professional.id || `${event.id}-professional`,
                    cache,
                  )
                : professional.logo,
            })),
          ),
        })),
      )) as SiteContentMap[K];
    case "kits":
      return (await Promise.all(
        (payload as KitCatalogItem[]).map(async (kit) => ({
          ...kit,
          image: kit.image
            ? await syncAssetUrlToSupabase(kit.image, "kits", kit.id || "kit-image", cache)
            : kit.image,
        })),
      )) as SiteContentMap[K];
    case "supporters":
    case "home_professionals":
      return (await Promise.all(
        (payload as SupporterLogo[]).map(async (supporter) => ({
          ...supporter,
          src: supporter.src
            ? await syncAssetUrlToSupabase(
                supporter.src,
                key === "home_professionals" ? "home-professionals" : "supporters",
                supporter.id || "supporter-image",
                cache,
              )
            : supporter.src,
        })),
      )) as SiteContentMap[K];
    case "team_members":
      return (await Promise.all(
        (payload as TeamMember[]).map(async (member) => ({
          ...member,
          photo: member.photo
            ? await syncAssetUrlToSupabase(member.photo, "team", member.id || "team-photo", cache)
            : member.photo,
        })),
      )) as SiteContentMap[K];
    case "curriculum_pages":
      return (await Promise.all(
        (payload as CurriculumPage[]).map(async (page) => ({
          ...page,
          heroImage: page.heroImage
            ? await syncAssetUrlToSupabase(page.heroImage, "curriculum", page.slug || "curriculum-hero", cache)
            : page.heroImage,
        })),
      )) as SiteContentMap[K];
    default:
      return payload;
  }
};

export const fallbackSiteContent: SiteContentMap = {
  events: siteEvents,
  impact_metrics: homeImpactMetrics,
  impact_countries: homeImpactCountries,
  kits: kitCatalog,
  workshops: [],
  supporters: partnerLogos,
  home_professionals: [],
  team_members: teamMembers,
  curriculum_age_groups: curriculumAgeGroupsFallback,
  curriculum_pages: curriculumPagesFallback,
};

export const emptySiteContent: SiteContentMap = {
  events: [],
  impact_metrics: [],
  impact_countries: [],
  kits: [],
  workshops: [],
  supporters: [],
  home_professionals: [],
  team_members: [],
  curriculum_age_groups: [],
  curriculum_pages: [],
};

const createBaseSiteContentState = () =>
  cloneValue(isSupabaseConfigured ? emptySiteContent : fallbackSiteContent);

export const siteContentLabels: Record<SiteContentKey, string> = {
  events: "Events",
  impact_metrics: "Impact metrics",
  impact_countries: "World map",
  kits: "Kits",
  workshops: "Workshops",
  supporters: "Supporters",
  home_professionals: "Home professionals",
  team_members: "Team members",
  curriculum_age_groups: "Curriculum age groups",
  curriculum_pages: "Curriculum pages",
};

const getInitialSiteContentState = () => {
  if (LOCAL_DEV_EDIT_MODE) {
    const devSessionContent = readDevSessionSiteContent();
    if (devSessionContent) {
      return cloneValue(devSessionContent);
    }

    const buildSnapshot = readBuildSiteContentSnapshot();
    if (buildSnapshot) {
      return cloneValue(buildSnapshot);
    }

    return cloneValue(fallbackSiteContent);
  }

  if (!isSupabaseConfigured) {
    return cloneValue(fallbackSiteContent);
  }

  const buildSnapshot = readBuildSiteContentSnapshot();
  if (buildSnapshot) {
    return cloneValue(buildSnapshot);
  }

  const cachedContent = readCachedSiteContent();
  return cachedContent ? cloneValue(cachedContent) : createBaseSiteContentState();
};

export const getFallbackSiteContent = <K extends SiteContentKey>(key: K): SiteContentMap[K] =>
  cloneValue((isSupabaseConfigured ? emptySiteContent : fallbackSiteContent)[key]);

export const normalizeSiteContent = <K extends SiteContentKey>(
  key: K,
  payload: unknown,
): SiteContentMap[K] => {
  if (!Array.isArray(payload)) {
    return getFallbackSiteContent(key);
  }

  return normalizeContentAssets(key, payload as SiteContentMap[K]);
};

const legacyHomeEventToSiteEvent = (event: Record<string, unknown>): SiteEvent => {
  const rawId = typeof event.id === "string" ? event.id : crypto.randomUUID();
  const title = typeof event.title === "string" ? event.title : "";
  const description = typeof event.description === "string" ? event.description : "";

  return {
    id: rawId,
    slug:
      (typeof event.slug === "string" && event.slug) ||
      rawId ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    title,
    status: typeof event.status === "string" ? event.status : "",
    date: typeof event.date === "string" ? event.date : "",
    location: typeof event.location === "string" ? event.location : "",
    shortDescription:
      (typeof event.shortDescription === "string" && event.shortDescription) ||
      description,
    fullDescription:
      (typeof event.fullDescription === "string" && event.fullDescription) ||
      description,
    featuredOnHome:
      typeof event.featuredOnHome === "boolean"
        ? event.featuredOnHome
        : true,
    accentTheme:
      event.accentTheme === "blue" ||
      event.accentTheme === "orange" ||
      event.accentTheme === "lime" ||
      event.accentTheme === "ink"
        ? event.accentTheme
        : "blue",
    href: typeof event.href === "string" ? event.href : "",
    hrefLabel: typeof event.hrefLabel === "string" ? event.hrefLabel : "",
    image: typeof event.image === "string" ? event.image : "",
    imageAlt: typeof event.imageAlt === "string" ? event.imageAlt : "",
    sponsors: Array.isArray(event.sponsors) ? normalizeEventOrganizations(event.sponsors as EventOrganization[]) : [],
    professionals: Array.isArray(event.professionals)
      ? normalizeEventOrganizations(event.professionals as EventOrganization[])
      : [],
  };
};

const normalizeSiteContentState = (
  payload: Partial<Record<SiteContentKey, unknown>> | null | undefined,
): SiteContentMap => {
  const nextContent = createBaseSiteContentState();

  if (!payload) {
    return nextContent;
  }

  (Object.keys(fallbackSiteContent) as SiteContentKey[]).forEach((key) => {
    const sourcePayload =
      key === "events" && !Array.isArray(payload[key])
        ? (payload as Partial<Record<"home_events", unknown>>).home_events
        : payload[key];

    if (key === "events" && Array.isArray(sourcePayload) && !Array.isArray(payload[key])) {
      nextContent[key] = normalizeContentAssets(
        key,
        sourcePayload.map((event) => legacyHomeEventToSiteEvent(event as Record<string, unknown>)) as SiteContentMap[typeof key],
      );
      return;
    }

    nextContent[key] = normalizeSiteContent(key, sourcePayload);
  });

  return nextContent;
};

const fetchSiteContentStateRow = async (
  options: SiteContentStateReadOptions = {},
): Promise<SiteContentStateRow | null> => {
  if (!supabase || !isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("site_content_state")
    .select("id, payload")
    .eq("id", SITE_CONTENT_ROW_ID)
    .maybeSingle<SiteContentStateRow>();

  if (error) {
    console.error("Failed to read site content state:", error);
    if (options.throwOnError) {
      throw error;
    }

    return null;
  }

  if (!data) {
    const missingRowError = new Error("The site content state row is missing.");
    console.error(missingRowError.message);
    if (options.throwOnError) {
      throw missingRowError;
    }
  }

  return data;
};

export const fetchSiteContent = async <K extends SiteContentKey>(
  key: K,
): Promise<SiteContentMap[K]> => {
  if (LOCAL_DEV_EDIT_MODE) {
    return getInitialSiteContentState()[key];
  }

  if (!supabase || !isSupabaseConfigured) {
    return getFallbackSiteContent(key);
  }

  const data = await fetchSiteContentStateRow({ throwOnError: true });
  const normalizedState = normalizeSiteContentState(data.payload);
  persistCachedSiteContent(normalizedState);

  return normalizedState[key];
};

export const fetchAllSiteContent = async (): Promise<SiteContentMap> => {
  if (LOCAL_DEV_EDIT_MODE) {
    return getInitialSiteContentState();
  }

  if (!supabase || !isSupabaseConfigured) {
    return cloneValue(fallbackSiteContent);
  }

  const data = await fetchSiteContentStateRow({ throwOnError: true });
  const normalizedState = normalizeSiteContentState(data.payload);
  persistCachedSiteContent(normalizedState);

  return normalizedState;
};

const syncAllImageBackedContentToStorage = async (
  payload: SiteContentMap,
): Promise<SiteContentMap> => {
  const nextPayload = cloneValue(payload);

  nextPayload.events = await syncImageBackedContentToStorage("events", nextPayload.events);
  nextPayload.kits = await syncImageBackedContentToStorage("kits", nextPayload.kits);
  nextPayload.supporters = await syncImageBackedContentToStorage("supporters", nextPayload.supporters);
  nextPayload.home_professionals = await syncImageBackedContentToStorage(
    "home_professionals",
    nextPayload.home_professionals,
  );
  nextPayload.team_members = await syncImageBackedContentToStorage("team_members", nextPayload.team_members);
  nextPayload.curriculum_pages = await syncImageBackedContentToStorage("curriculum_pages", nextPayload.curriculum_pages);

  return nextPayload;
};

export const saveAllSiteContent = async (payload: SiteContentMap): Promise<SiteContentMap> => {
  if (LOCAL_DEV_EDIT_MODE) {
    const nextPayload = cloneValue(payload);
    persistDevSessionSiteContent(nextPayload);
    persistCachedSiteContent(nextPayload);
    return nextPayload;
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  try {
    await ensureActiveSupabaseSession();
    const nextPayload = await syncAllImageBackedContentToStorage(payload);

    const { error } = await supabase.from("site_content_state").upsert(
      {
        id: SITE_CONTENT_ROW_ID,
        payload: nextPayload,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }

    const verifiedState = await fetchSiteContentStateRow({ throwOnError: true });
    const verifiedPayload = normalizeSiteContentState(verifiedState?.payload);

    if (
      stableSerializeForComparison(verifiedPayload) !==
        stableSerializeForComparison(normalizeSiteContentState(nextPayload))
    ) {
      throw new Error("Content save could not be verified from Supabase.");
    }

    persistCachedSiteContent(verifiedPayload);
    return verifiedPayload;
  } catch (error) {
    throw normalizeAdminMutationError(error);
  }
};

export const saveSiteContent = async <K extends SiteContentKey>(
  key: K,
  payload: SiteContentMap[K],
): Promise<void> => {
  if (LOCAL_DEV_EDIT_MODE) {
    const currentContent = getInitialSiteContentState();
    const nextPayload: SiteContentMap = {
      ...currentContent,
      [key]: cloneValue(payload),
    };

    persistDevSessionSiteContent(nextPayload);
    persistCachedSiteContent(nextPayload);
    return;
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  try {
    await ensureActiveSupabaseSession();
    const syncedPayload = await syncImageBackedContentToStorage(key, payload);
    const currentContent = await fetchAllSiteContent();
    const nextPayload: SiteContentMap = {
      ...currentContent,
      [key]: syncedPayload,
    };

    nextPayload.events = await syncImageBackedContentToStorage("events", nextPayload.events);
    nextPayload.kits = await syncImageBackedContentToStorage("kits", nextPayload.kits);
    nextPayload.supporters = await syncImageBackedContentToStorage("supporters", nextPayload.supporters);
    nextPayload.home_professionals = await syncImageBackedContentToStorage(
      "home_professionals",
      nextPayload.home_professionals,
    );
    nextPayload.team_members = await syncImageBackedContentToStorage("team_members", nextPayload.team_members);
    nextPayload.curriculum_pages = await syncImageBackedContentToStorage("curriculum_pages", nextPayload.curriculum_pages);

    const { error } = await supabase.from("site_content_state").upsert(
      {
        id: SITE_CONTENT_ROW_ID,
        payload: nextPayload,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }

    const verifiedState = await fetchSiteContentStateRow({ throwOnError: true });
    const verifiedPayload = normalizeSiteContentState(verifiedState?.payload);

    if (
      stableSerializeForComparison(verifiedPayload[key]) !==
        stableSerializeForComparison(normalizeContentAssets(key, nextPayload[key]))
    ) {
      throw new Error("Content save could not be verified from Supabase.");
    }

    persistCachedSiteContent(verifiedPayload);
  } catch (error) {
    throw normalizeAdminMutationError(error);
  }
};

export const uploadSiteAsset = async (file: File, folder: string): Promise<string> => {
  if (LOCAL_DEV_EDIT_MODE) {
    const uploadFile = await optimizeImageForUpload(file, folder);

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Could not read the image locally."));
      reader.readAsDataURL(uploadFile);
    });
  }

  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  try {
    await ensureActiveSupabaseSession();
    const uploadFile = await optimizeImageForUpload(file, folder);
    const safeFolder = folder.replace(/[^a-z0-9/-]/gi, "-").toLowerCase();
    const fileExt = uploadFile.name.split(".").pop() || "png";
    const filePath = `${safeFolder}/${crypto.randomUUID()}.${fileExt}`;

    const uploadResult = await Promise.race([
      supabase.storage
        .from("site-assets")
        .upload(filePath, uploadFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: uploadFile.type || file.type || undefined,
        }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error("Upload timed out. Please try a smaller image."));
        }, STORAGE_UPLOAD_TIMEOUT_MS);
      }),
    ]);

    const { error: uploadError } = uploadResult;

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("site-assets").getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    throw normalizeAdminMutationError(error);
  }
};

export const useAllSiteContentQuery = <T = SiteContentMap>(
  select?: (data: SiteContentMap) => T,
  options: {
    staleTime?: number;
    gcTime?: number;
    refetchOnMount?: boolean | "always";
    refetchOnWindowFocus?: boolean;
  } = {},
) =>
  useQuery<SiteContentMap, Error, T>({
    queryKey: ["site-content", "all"],
    queryFn: fetchAllSiteContent,
    initialData: getInitialSiteContentState(),
    staleTime: options.staleTime ?? SITE_CONTENT_STALE_TIME_MS,
    gcTime: options.gcTime ?? SITE_CONTENT_GC_TIME_MS,
    refetchOnMount: options.refetchOnMount ?? false,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchOnReconnect: true,
    select,
  });

export const useSiteContentQuery = <K extends SiteContentKey>(key: K) =>
  useAllSiteContentQuery((data) => data[key]);
