import { useQuery } from "@tanstack/react-query";
import {
  homeImpactMetrics,
  homeImpactCountries,
  homeLiveEvents,
  kitCatalog,
  partnerLogos,
  teamMembers,
  type HomeEvent,
  type HomeImpactCountry,
  type HomeImpactMetric,
  type KitCatalogItem,
  type SupporterLogo,
  type TeamMember,
} from "@/lib/site-data";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
  | "home_events"
  | "impact_metrics"
  | "impact_countries"
  | "kits"
  | "workshops"
  | "supporters"
  | "team_members";

export type SiteContentMap = {
  home_events: HomeEvent[];
  impact_metrics: HomeImpactMetric[];
  impact_countries: HomeImpactCountry[];
  kits: KitCatalogItem[];
  workshops: WorkshopItem[];
  supporters: SupporterLogo[];
  team_members: TeamMember[];
};

type SiteContentStateRow = {
  id: number;
  payload: Partial<Record<SiteContentKey, unknown>>;
};

const SITE_CONTENT_ROW_ID = 1;
const SITE_ASSET_PUBLIC_SEGMENT = "/storage/v1/object/public/site-assets/";
const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DEFAULT_MAX_UPLOAD_IMAGE_DIMENSION = 1800;
const DEFAULT_MAX_UPLOAD_IMAGE_BYTES = 1.1 * 1024 * 1024;
const TEAM_MAX_UPLOAD_IMAGE_DIMENSION = 1400;
const TEAM_MAX_UPLOAD_IMAGE_BYTES = 700 * 1024;
const JPEG_UPLOAD_QUALITY = 0.76;
const IMAGE_OPTIMIZATION_TIMEOUT_MS = 12_000;
const STORAGE_UPLOAD_TIMEOUT_MS = 45_000;

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

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
  homeLiveEvents.map((event) => [
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

const normalizeHomeEvents = (events: HomeEvent[]): HomeEvent[] =>
  events.map((event) => {
    const fallbackAsset = fallbackEventAssetMap.get(event.id);

    return {
      ...event,
      image: shouldReplaceWithFallbackAsset(event.image) ? fallbackAsset?.image ?? event.image : event.image,
      imageAlt: event.imageAlt || fallbackAsset?.imageAlt || "",
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

const normalizeContentAssets = <K extends SiteContentKey>(
  key: K,
  payload: SiteContentMap[K],
): SiteContentMap[K] => {
  switch (key) {
    case "home_events":
      return normalizeHomeEvents(payload as HomeEvent[]) as SiteContentMap[K];
    case "kits":
      return normalizeKits(payload as KitCatalogItem[]) as SiteContentMap[K];
    case "supporters":
      return normalizeSupporters(payload as SupporterLogo[]) as SiteContentMap[K];
    case "team_members":
      return normalizeTeamMembers(payload as TeamMember[]) as SiteContentMap[K];
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
    case "home_events":
      return (await Promise.all(
        (payload as HomeEvent[]).map(async (event) => ({
          ...event,
          image: event.image
            ? await syncAssetUrlToSupabase(event.image, "events", event.id || "event-image", cache)
            : event.image,
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
      return (await Promise.all(
        (payload as SupporterLogo[]).map(async (supporter) => ({
          ...supporter,
          src: supporter.src
            ? await syncAssetUrlToSupabase(supporter.src, "supporters", supporter.id || "supporter-image", cache)
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
    default:
      return payload;
  }
};

export const fallbackSiteContent: SiteContentMap = {
  home_events: homeLiveEvents,
  impact_metrics: homeImpactMetrics,
  impact_countries: homeImpactCountries,
  kits: kitCatalog,
  workshops: [],
  supporters: partnerLogos,
  team_members: teamMembers,
};

export const siteContentLabels: Record<SiteContentKey, string> = {
  home_events: "Home events",
  impact_metrics: "Impact metrics",
  impact_countries: "World map",
  kits: "Kits",
  workshops: "Workshops",
  supporters: "Supporters",
  team_members: "Team members",
};

export const getFallbackSiteContent = <K extends SiteContentKey>(key: K): SiteContentMap[K] =>
  cloneValue(fallbackSiteContent[key]);

export const normalizeSiteContent = <K extends SiteContentKey>(
  key: K,
  payload: unknown,
): SiteContentMap[K] => {
  if (!Array.isArray(payload)) {
    return getFallbackSiteContent(key);
  }

  return normalizeContentAssets(key, payload as SiteContentMap[K]);
};

const normalizeSiteContentState = (
  payload: Partial<Record<SiteContentKey, unknown>> | null | undefined,
): SiteContentMap => {
  const nextContent = cloneValue(fallbackSiteContent);

  if (!payload) {
    return nextContent;
  }

  (Object.keys(fallbackSiteContent) as SiteContentKey[]).forEach((key) => {
    nextContent[key] = normalizeSiteContent(key, payload[key]);
  });

  return nextContent;
};

export const fetchSiteContent = async <K extends SiteContentKey>(
  key: K,
): Promise<SiteContentMap[K]> => {
  if (!supabase || !isSupabaseConfigured) {
    return getFallbackSiteContent(key);
  }

  const { data, error } = await supabase
    .from("site_content_state")
    .select("id, payload")
    .eq("id", SITE_CONTENT_ROW_ID)
    .maybeSingle<SiteContentStateRow>();

  if (error || !data) {
    return getFallbackSiteContent(key);
  }

  return normalizeSiteContent(key, data.payload?.[key]);
};

export const fetchAllSiteContent = async (): Promise<SiteContentMap> => {
  if (!supabase || !isSupabaseConfigured) {
    return cloneValue(fallbackSiteContent);
  }

  const { data, error } = await supabase
    .from("site_content_state")
    .select("id, payload")
    .eq("id", SITE_CONTENT_ROW_ID)
    .maybeSingle<SiteContentStateRow>();

  if (error || !data) {
    return cloneValue(fallbackSiteContent);
  }

  return normalizeSiteContentState(data.payload);
};

export const saveSiteContent = async <K extends SiteContentKey>(
  key: K,
  payload: SiteContentMap[K],
): Promise<void> => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const syncedPayload = await syncImageBackedContentToStorage(key, payload);
  const currentContent = await fetchAllSiteContent();
  const nextPayload: SiteContentMap = {
    ...currentContent,
    [key]: syncedPayload,
  };

  nextPayload.home_events = await syncImageBackedContentToStorage("home_events", nextPayload.home_events);
  nextPayload.kits = await syncImageBackedContentToStorage("kits", nextPayload.kits);
  nextPayload.supporters = await syncImageBackedContentToStorage("supporters", nextPayload.supporters);
  nextPayload.team_members = await syncImageBackedContentToStorage("team_members", nextPayload.team_members);

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
};

export const uploadSiteAsset = async (file: File, folder: string): Promise<string> => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

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
};

export const useSiteContentQuery = <K extends SiteContentKey>(key: K) =>
  useQuery({
    queryKey: ["site-content", key],
    queryFn: () => fetchSiteContent(key),
    initialData: getFallbackSiteContent(key),
  });

export const useAllSiteContentQuery = () =>
  useQuery({
    queryKey: ["site-content", "all"],
    queryFn: fetchAllSiteContent,
    initialData: cloneValue(fallbackSiteContent),
  });
