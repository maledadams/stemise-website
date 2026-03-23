import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GripVertical,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { clearStoredAdminSessionState, useAdminAuth } from "@/components/AdminAuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  fetchAllSiteContent,
  saveSiteContent,
  siteContentLabels,
  uploadSiteAsset,
  useAllSiteContentQuery,
  type SiteContentKey,
  type SiteContentMap,
  type WorkshopItem,
} from "@/lib/site-content";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  HomeEvent,
  HomeImpactCountry,
  HomeImpactMetric,
  KitCatalogItem,
  SupporterLogo,
  TeamMember,
} from "@/lib/site-data";

const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

const createEmptyEvent = (): HomeEvent => ({
  id: makeId("event"),
  title: "",
  status: "Open now",
  date: "",
  location: "",
  description: "",
  href: "",
  hrefLabel: "",
  image: "",
  imageAlt: "",
});

const createEmptyMetric = (): HomeImpactMetric => ({
  value: 0,
  label: "",
  prefix: "",
  suffix: "",
});

const createEmptyKit = (): KitCatalogItem => ({
  id: makeId("kit"),
  name: "",
  description: "",
  grades: "",
  students: "",
  availability: "Available now",
  materials: [],
  image: "",
});

const createEmptyWorkshop = (): WorkshopItem => ({
  id: makeId("workshop"),
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  registrationLink: "",
});

const createEmptySupporter = (): SupporterLogo => ({
  id: makeId("supporter"),
  name: "",
  src: "",
  href: "",
});

const createEmptyTeamMember = (): TeamMember => ({
  id: makeId("team"),
  title: "",
  name: "",
  bio: "",
  photo: "",
  founder: false,
  socials: {
    instagram: "",
    linkedin: "",
    tiktok: "",
  },
});

const sectionOrder: SiteContentKey[] = [
  "home_events",
  "impact_metrics",
  "impact_countries",
  "kits",
  "workshops",
  "supporters",
  "team_members",
];

const AssetField = ({
  label,
  value,
  onChange,
  onUpload,
  uploading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Open image
        </a>
      ) : null}
    </div>
    {value ? (
      <div className="overflow-hidden rounded-[1.2rem] border-2 border-foreground bg-white">
        <img src={value} alt={label} className="h-40 w-full object-cover" />
      </div>
    ) : (
      <div className="flex h-40 items-center justify-center rounded-[1.2rem] border-2 border-dashed border-border bg-secondary/50 text-sm text-muted-foreground">
        No image selected yet
      </div>
    )}
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Paste an image URL"
    />
    <div className="flex flex-wrap items-center gap-3">
      <Input
        type="file"
        accept=".png,.PNG,.jpg,.JPG,.jpeg,.JPEG,image/png,image/jpeg"
        className="max-w-sm"
        disabled={uploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          await onUpload(file);
          event.target.value = "";
        }}
      />
      {uploading ? (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Uploading...
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" />
          Upload JPG, JPEG, or PNG to Supabase
        </div>
      )}
    </div>
  </div>
);

const SectionShell = ({
  title,
  description,
  onReset,
  children,
}: {
  title: string;
  description: string;
  onReset: () => void;
  children: React.ReactNode;
}) => (
  <Card className="rounded-[2rem] border-2 border-foreground bg-white">
    <CardHeader className="gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-sm leading-6">
            {description}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onReset}>
            Reset section
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-6">{children}</CardContent>
  </Card>
);

const isCountriesMetric = (label: string) => label.trim().toLowerCase() === "countries";

const syncCountriesMetric = (
  metrics: HomeImpactMetric[],
  countries: HomeImpactCountry[],
): HomeImpactMetric[] => {
  const countryCount = countries.length;
  const existingMetric = metrics.find((metric) => isCountriesMetric(metric.label));

  if (existingMetric) {
    return metrics.map((metric) =>
      isCountriesMetric(metric.label)
        ? {
            ...metric,
            value: countryCount,
          }
        : metric,
    );
  }

  return [
    ...metrics,
    {
      value: countryCount,
      label: "Countries",
    },
  ];
};

type WorldGeoJson = {
  features: Array<{
    properties?: {
      name?: string;
    };
  }>;
};

const Admin = () => {
  const queryClient = useQueryClient();
  const { data } = useAllSiteContentQuery();
  const { session, isAdmin, isLoading: authLoading } = useAdminAuth();
  const [content, setContent] = useState<SiteContentMap>(() => cloneValue(data));
  const [authPending, setAuthPending] = useState(false);
  const [email, setEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [activeTab, setActiveTab] = useState<SiteContentKey>("home_events");
  const [availableCountryNames, setAvailableCountryNames] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [draggedTeamMemberId, setDraggedTeamMemberId] = useState<string | null>(null);
  const [teamDropTargetId, setTeamDropTargetId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    setContent(cloneValue(data));
  }, [data]);

  useEffect(() => {
    let mounted = true;

    const loadWorldCountries = async () => {
      try {
        const response = await fetch("/data/world.geojson");
        const geoJson = (await response.json()) as WorldGeoJson;
        const names = Array.from(
          new Set(
            geoJson.features
              .map((feature) => feature.properties?.name?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort((left, right) => left.localeCompare(right));

        if (mounted) {
          setAvailableCountryNames(names);
        }
      } catch {
        if (mounted) {
          setAvailableCountryNames([]);
        }
      }
    };

    loadWorldCountries();

    return () => {
      mounted = false;
    };
  }, []);

  const sectionCounts = useMemo(
    () =>
      sectionOrder.reduce<Record<SiteContentKey, number>>((accumulator, key) => {
        accumulator[key] = content[key].length;
        return accumulator;
      }, {} as Record<SiteContentKey, number>),
    [content],
  );
  const syncedImpactMetrics = useMemo(
    () => syncCountriesMetric(content.impact_metrics, content.impact_countries),
    [content.impact_countries, content.impact_metrics],
  );

  const selectedImpactMapNames = useMemo(
    () =>
      new Set(
        content.impact_countries.flatMap((country) => country.mapNames),
      ),
    [content.impact_countries],
  );
  const filteredCountryNames = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return availableCountryNames;

    return availableCountryNames.filter((countryName) =>
      countryName.toLowerCase().includes(query),
    );
  }, [availableCountryNames, countrySearch]);

  const replaceSection = <K extends SiteContentKey>(key: K, nextValue: SiteContentMap[K]) => {
    setContent((current) => ({
      ...current,
      [key]: nextValue,
    }));
  };

  const updateArrayItem = <K extends SiteContentKey>(
    key: K,
    index: number,
    updater: (item: SiteContentMap[K][number]) => SiteContentMap[K][number],
  ) => {
    replaceSection(
      key,
      content[key].map((item, itemIndex) => (itemIndex === index ? updater(item) : item)) as SiteContentMap[K],
    );
  };

  const removeArrayItem = <K extends SiteContentKey>(key: K, index: number) => {
    replaceSection(
      key,
      content[key].filter((_, itemIndex) => itemIndex !== index) as SiteContentMap[K],
    );
  };

  const appendArrayItem = <K extends SiteContentKey>(key: K, item: SiteContentMap[K][number]) => {
    replaceSection(key, [...content[key], item] as SiteContentMap[K]);
  };

  const moveArrayItem = <K extends SiteContentKey>(key: K, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const nextItems = [...content[key]];
    const [movedItem] = nextItems.splice(fromIndex, 1);

    if (!movedItem) return;

    nextItems.splice(toIndex, 0, movedItem);
    replaceSection(key, nextItems as SiteContentMap[K]);
  };

  const toggleImpactCountry = (countryName: string) => {
    const currentlySelected = content.impact_countries.some((country) =>
      country.mapNames.includes(countryName),
    );

    if (currentlySelected) {
      replaceSection(
        "impact_countries",
        content.impact_countries.filter((country) => !country.mapNames.includes(countryName)),
      );
      return;
    }

    replaceSection("impact_countries", [
      ...content.impact_countries,
      {
        label: countryName,
        mapNames: [countryName],
      },
    ]);
  };

  const handleUpload = async (
    fieldKey: string,
    folder: string,
    onComplete: (url: string) => void,
    file: File,
  ) => {
    try {
      setUploadingField(fieldKey);
      const url = await uploadSiteAsset(file, folder);
      onComplete(url);
      toast({
        title: "Asset uploaded",
        description: "The image is now stored in Supabase and linked into this section.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
    }
  };

  const triggerRedeployAfterSave = async (scope: string) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const { data, error, response } = await supabase.functions.invoke("trigger-redeploy", {
      body: {
        section: scope,
      },
      timeout: 20_000,
    });

    if (error) {
      if (response) {
        try {
          const errorPayload = await response.clone().json();
          if (errorPayload?.error) {
            throw new Error(errorPayload.error as string);
          }
        } catch {
          const errorText = await response.clone().text().catch(() => "");
          if (errorText) {
            throw new Error(errorText);
          }
        }
      }

      throw new Error(error.message);
    }

    return data;
  };

  const handleSaveAll = async () => {
    try {
      setSavingAll(true);
      const nextContent: SiteContentMap = {
        ...content,
        impact_metrics: syncCountriesMetric(content.impact_metrics, content.impact_countries),
      };

      setContent(nextContent);

      for (const key of sectionOrder) {
        await saveSiteContent(key, nextContent[key]);
      }

      await queryClient.invalidateQueries({ queryKey: ["site-content"] });
      const nextAllContent = await fetchAllSiteContent();
      setContent(nextAllContent);
      await triggerRedeployAfterSave("all");
      toast({
        title: "All content saved",
        description: "Everything was saved and a fresh redeploy was triggered.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed.";
      toast({
        title: "Could not save changes",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingAll(false);
    }
  };

  const handleResetSection = (key: SiteContentKey) => {
    replaceSection(key, cloneValue(data[key]));
  };

  const handleSendMagicLink = async () => {
    if (!supabase) return;

    try {
      setAuthPending(true);
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          shouldCreateUser: false,
        },
      });

      if (error) {
        throw error;
      }

      setMagicLinkSent(true);
      toast({
        title: "Magic link sent",
        description: "Check your inbox and open the link on this device to unlock admin mode.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Magic link failed.";
      toast({
        title: "Could not send magic link",
        description: message,
        variant: "destructive",
      });
    } finally {
      setAuthPending(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();
      clearStoredAdminSessionState();
      toast({
        title: "Signed out",
        description: "Admin mode is locked again.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign-out failed.";
      toast({
        title: "Could not sign out",
        description: message,
        variant: "destructive",
      });
    }
  };

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Admin" pathname="/admin" noIndex />
        <Header />
        <main className="section-shell">
          <div className="container">
            <Card className="mx-auto max-w-3xl rounded-[2rem] border-2 border-foreground bg-white">
              <CardHeader>
                <CardTitle className="text-3xl">Supabase is required for admin mode.</CardTitle>
                <CardDescription className="text-base leading-7">
                  Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then run the new
                  Supabase migration so `/admin` can authenticate and store editable site content.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Admin" pathname="/admin" noIndex />
        <Header />
        <main className="section-shell">
          <div className="container flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-full border-2 border-foreground bg-white px-6 py-3 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking admin session...
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Admin" pathname="/admin" noIndex />
        <Header />
        <main className="section-shell">
          <div className="container">
            <Card className="mx-auto max-w-xl rounded-[2rem] border-2 border-foreground bg-white">
              <CardHeader>
                <div className="inline-flex w-fit rounded-full border-2 border-foreground bg-[#fff4a8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  Admin
                </div>
                <CardTitle className="mt-4 text-4xl">Sign in to edit STEMise content.</CardTitle>
                <CardDescription className="text-base leading-7">
                  This panel uses Supabase magic links only. Enter an existing admin email and we
                  will send you a sign-in link that opens `/admin`.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMagicLinkSent(false);
                  }}
                  placeholder="Admin email"
                />
                {magicLinkSent ? (
                  <div className="rounded-[1.4rem] border-2 border-foreground bg-[#eef8dc] px-4 py-3 text-sm leading-6 text-foreground">
                    Magic link sent. Open the email on this device. Your admin session will always
                    expire after 30 minutes.
                  </div>
                ) : null}
                <Button onClick={handleSendMagicLink} disabled={authPending || !email} className="w-full">
                  {authPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Send magic link
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Seo title="Admin" pathname="/admin" noIndex />
        <Header />
        <main className="section-shell">
          <div className="container">
            <Card className="mx-auto max-w-xl rounded-[2rem] border-2 border-foreground bg-white">
              <CardHeader>
                <div className="inline-flex w-fit rounded-full border-2 border-foreground bg-[#fff4a8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  Admin
                </div>
                <CardTitle className="mt-4 text-4xl">This account is not on the admin allowlist.</CardTitle>
                <CardDescription className="text-base leading-7">
                  Add this email to `public.admin_allowlist` in Supabase, then sign in again.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" variant="outline" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Admin" pathname="/admin" noIndex />
      <Header />
      <main className="section-shell bg-white">
        <div className="container space-y-8">
          <Card className="rounded-[2rem] border-2 border-foreground bg-[#fff8f2]">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex rounded-full border-2 border-foreground bg-[#fff4a8] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]">
                    Admin mode
                  </div>
                  <CardTitle className="mt-4 text-4xl">Edit live STEMise site content.</CardTitle>
                  <CardDescription className="mt-2 max-w-3xl text-base leading-7">
                    This editor updates the homepage events, impact metrics, world map countries, kits, workshops,
                    supporters, and team members through Supabase. Make all the edits you need across tabs, then save
                    once when you are done.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={handleSaveAll} disabled={savingAll}>
                    {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save all changes
                  </Button>
                  <Button type="button" variant="outline" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SiteContentKey)} className="space-y-6">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.6rem] border-2 border-foreground bg-white p-2">
              {sectionOrder.map((key) => (
                <TabsTrigger key={key} value={key} className="rounded-full px-4 py-2">
                  {siteContentLabels[key]} ({sectionCounts[key]})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="home_events">
              <SectionShell
                title="Home events"
                description="Add or edit the cards shown in the homepage events section. Every event follows the same card template."
                onReset={() => handleResetSection("home_events")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("home_events", createEmptyEvent())}>
                    <Plus className="h-4 w-4" />
                    Add event
                  </Button>
                </div>
                <div className="space-y-6">
                  {content.home_events.map((event, index) => (
                    <Card key={event.id} className="rounded-[1.8rem] border-2 border-foreground bg-white">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">{event.title || `Event ${index + 1}`}</CardTitle>
                          <CardDescription>Edit the homepage event card content and image.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeArrayItem("home_events", index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            value={event.title}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                title: eventValue.target.value,
                                id: current.id || slugify(eventValue.target.value) || makeId("event"),
                              }))
                            }
                            placeholder="Title"
                          />
                          <Input
                            value={event.status}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                status: eventValue.target.value,
                              }))
                            }
                            placeholder="Status"
                          />
                          <Input
                            value={event.date}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                date: eventValue.target.value,
                              }))
                            }
                            placeholder="Date"
                          />
                          <Input
                            value={event.location}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                location: eventValue.target.value,
                              }))
                            }
                            placeholder="Location"
                          />
                          <Input
                            value={event.href ?? ""}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                href: eventValue.target.value,
                              }))
                            }
                            placeholder="Button link"
                          />
                          <Input
                            value={event.hrefLabel ?? ""}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                hrefLabel: eventValue.target.value,
                              }))
                            }
                            placeholder="Button label"
                          />
                          <Textarea
                            className="md:col-span-2 min-h-[140px]"
                            value={event.description}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                description: eventValue.target.value,
                              }))
                            }
                            placeholder="Description"
                          />
                          <Input
                            className="md:col-span-2"
                            value={event.imageAlt ?? ""}
                            onChange={(eventValue) =>
                              updateArrayItem("home_events", index, (current) => ({
                                ...current,
                                imageAlt: eventValue.target.value,
                              }))
                            }
                            placeholder="Image alt text"
                          />
                        </div>

                        <AssetField
                          label="Event image"
                          value={event.image ?? ""}
                          onChange={(value) =>
                            updateArrayItem("home_events", index, (current) => ({
                              ...current,
                              image: value,
                            }))
                          }
                          uploading={uploadingField === `event-image-${index}`}
                          onUpload={(file) =>
                            handleUpload(
                              `event-image-${index}`,
                              "events",
                              (url) =>
                                updateArrayItem("home_events", index, (current) => ({
                                  ...current,
                                  image: url,
                                })),
                              file,
                            )
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="impact_metrics">
              <SectionShell
                title="Impact metrics"
                description="Edit the animated counters used in the homepage impact section."
                onReset={() => handleResetSection("impact_metrics")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("impact_metrics", createEmptyMetric())}>
                    <Plus className="h-4 w-4" />
                    Add metric
                  </Button>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  {syncedImpactMetrics.map((metric, index) => (
                    <Card key={`${metric.label}-${index}`} className="rounded-[1.8rem] border-2 border-foreground bg-white">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle>{metric.label || `Metric ${index + 1}`}</CardTitle>
                          <CardDescription>
                            {isCountriesMetric(metric.label)
                              ? "This value is linked to the world map selection and updates automatically."
                              : "Value, label, and optional prefix or suffix."}
                          </CardDescription>
                        </div>
                        {isCountriesMetric(metric.label) ? null : (
                          <Button type="button" variant="outline" onClick={() => removeArrayItem("impact_metrics", index)}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        )}
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <Input
                          type="number"
                          value={metric.value}
                          disabled={isCountriesMetric(metric.label)}
                          onChange={(eventValue) =>
                            updateArrayItem("impact_metrics", index, (current) => ({
                              ...current,
                              value: Number(eventValue.target.value || 0),
                            }))
                          }
                          placeholder="Value"
                        />
                        <Input
                          value={metric.label}
                          disabled={isCountriesMetric(metric.label)}
                          onChange={(eventValue) =>
                            updateArrayItem("impact_metrics", index, (current) => ({
                              ...current,
                              label: eventValue.target.value,
                            }))
                          }
                          placeholder="Label"
                        />
                        <Input
                          value={metric.prefix ?? ""}
                          onChange={(eventValue) =>
                            updateArrayItem("impact_metrics", index, (current) => ({
                              ...current,
                              prefix: eventValue.target.value,
                            }))
                          }
                          placeholder="Prefix"
                        />
                        <Input
                          value={metric.suffix ?? ""}
                          onChange={(eventValue) =>
                            updateArrayItem("impact_metrics", index, (current) => ({
                              ...current,
                              suffix: eventValue.target.value,
                            }))
                          }
                          placeholder="Suffix"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="impact_countries">
              <SectionShell
                title="World map"
                description="Click countries to select or deselect them for the homepage globe. The currently highlighted countries are already selected."
                onReset={() => handleResetSection("impact_countries")}
              >
                <div className="rounded-[1.6rem] border-2 border-foreground bg-[#f7fbff] p-5">
                  <p className="text-sm font-medium text-muted-foreground">
                    Selected: {content.impact_countries.length} countries
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {content.impact_countries.map((country) => (
                      <div
                        key={`${country.label}-${country.mapNames.join("|")}`}
                        className="inline-flex items-center rounded-full border-2 border-foreground bg-[#fff4a8] px-4 py-2 text-sm font-semibold text-foreground"
                      >
                        {country.label}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5">
                    <Input
                      value={countrySearch}
                      onChange={(event) => setCountrySearch(event.target.value)}
                      placeholder="Search for a country"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredCountryNames.map((countryName) => {
                    const isSelected = selectedImpactMapNames.has(countryName);

                    return (
                      <button
                        key={countryName}
                        type="button"
                        onClick={() => toggleImpactCountry(countryName)}
                        className={`rounded-[1.4rem] border-2 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                          isSelected
                            ? "border-foreground bg-[#eef8dc] text-foreground"
                            : "border-foreground bg-white text-muted-foreground hover:bg-secondary/60"
                        }`}
                      >
                        {countryName}
                      </button>
                    );
                  })}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="kits">
              <SectionShell
                title="Kits"
                description="Manage the kits shown on the Kits page, including availability, audience, materials, and image."
                onReset={() => handleResetSection("kits")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("kits", createEmptyKit())}>
                    <Plus className="h-4 w-4" />
                    Add kit
                  </Button>
                </div>
                <div className="space-y-6">
                  {content.kits.map((kit, index) => (
                    <Card key={kit.id} className="rounded-[1.8rem] border-2 border-foreground bg-white">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">{kit.name || `Kit ${index + 1}`}</CardTitle>
                          <CardDescription>Add new kits or edit existing kit cards.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeArrayItem("kits", index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Input
                            value={kit.name}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                name: eventValue.target.value,
                                id: current.id || slugify(eventValue.target.value) || makeId("kit"),
                              }))
                            }
                            placeholder="Kit name"
                          />
                          <Input
                            value={kit.availability}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                availability: eventValue.target.value,
                              }))
                            }
                            placeholder="Availability"
                          />
                          <Input
                            value={kit.grades}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                grades: eventValue.target.value,
                              }))
                            }
                            placeholder="Age or grade range"
                          />
                          <Input
                            value={kit.students}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                students: eventValue.target.value,
                              }))
                            }
                            placeholder="Recommended learners"
                          />
                          <Textarea
                            className="md:col-span-2 min-h-[140px]"
                            value={kit.description}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                description: eventValue.target.value,
                              }))
                            }
                            placeholder="Description"
                          />
                          <Textarea
                            className="md:col-span-2 min-h-[100px]"
                            value={kit.materials.join(", ")}
                            onChange={(eventValue) =>
                              updateArrayItem("kits", index, (current) => ({
                                ...current,
                                materials: eventValue.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              }))
                            }
                            placeholder="Materials, separated by commas"
                          />
                        </div>

                        <AssetField
                          label="Kit image"
                          value={kit.image}
                          onChange={(value) =>
                            updateArrayItem("kits", index, (current) => ({
                              ...current,
                              image: value,
                            }))
                          }
                          uploading={uploadingField === `kit-image-${index}`}
                          onUpload={(file) =>
                            handleUpload(
                              `kit-image-${index}`,
                              "kits",
                              (url) =>
                                updateArrayItem("kits", index, (current) => ({
                                  ...current,
                                  image: url,
                                })),
                              file,
                            )
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="workshops">
              <SectionShell
                title="Workshops"
                description="This replaces the old Google Sheets feed. Workshops saved here appear on the Curriculum page."
                onReset={() => handleResetSection("workshops")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("workshops", createEmptyWorkshop())}>
                    <Plus className="h-4 w-4" />
                    Add workshop
                  </Button>
                </div>
                <div className="space-y-6">
                  {content.workshops.map((workshop, index) => (
                    <Card key={workshop.id} className="rounded-[1.8rem] border-2 border-foreground bg-white">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">{workshop.title || `Workshop ${index + 1}`}</CardTitle>
                          <CardDescription>Workshop cards on the curriculum page.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeArrayItem("workshops", index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <Input
                          value={workshop.title}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              title: eventValue.target.value,
                              id: current.id || slugify(eventValue.target.value) || makeId("workshop"),
                            }))
                          }
                          placeholder="Workshop title"
                        />
                        <Input
                          value={workshop.location}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              location: eventValue.target.value,
                            }))
                          }
                          placeholder="Location"
                        />
                        <Input
                          value={workshop.date}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              date: eventValue.target.value,
                            }))
                          }
                          placeholder="Date"
                        />
                        <Input
                          value={workshop.time}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              time: eventValue.target.value,
                            }))
                          }
                          placeholder="Time"
                        />
                        <Input
                          className="md:col-span-2"
                          value={workshop.registrationLink ?? ""}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              registrationLink: eventValue.target.value,
                            }))
                          }
                          placeholder="Registration link"
                        />
                        <Textarea
                          className="md:col-span-2 min-h-[140px]"
                          value={workshop.description}
                          onChange={(eventValue) =>
                            updateArrayItem("workshops", index, (current) => ({
                              ...current,
                              description: eventValue.target.value,
                            }))
                          }
                          placeholder="Description"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="supporters">
              <SectionShell
                title="Supporters"
                description="Manage the supporter logos shown in the supporters section, including image and redirect link."
                onReset={() => handleResetSection("supporters")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("supporters", createEmptySupporter())}>
                    <Plus className="h-4 w-4" />
                    Add supporter
                  </Button>
                </div>
                <div className="space-y-6">
                  {content.supporters.map((supporter, index) => (
                    <Card key={supporter.id} className="rounded-[1.8rem] border-2 border-foreground bg-white">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl">{supporter.name || `Supporter ${index + 1}`}</CardTitle>
                          <CardDescription>Supporter logo card and outbound link.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeArrayItem("supporters", index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-4">
                          <Input
                            value={supporter.name}
                            onChange={(eventValue) =>
                              updateArrayItem("supporters", index, (current) => ({
                                ...current,
                                name: eventValue.target.value,
                                id: current.id || slugify(eventValue.target.value) || makeId("supporter"),
                              }))
                            }
                            placeholder="Supporter name"
                          />
                          <Input
                            value={supporter.href ?? ""}
                            onChange={(eventValue) =>
                              updateArrayItem("supporters", index, (current) => ({
                                ...current,
                                href: eventValue.target.value,
                              }))
                            }
                            placeholder="Redirect link"
                          />
                        </div>

                        <AssetField
                          label="Supporter image"
                          value={supporter.src}
                          onChange={(value) =>
                            updateArrayItem("supporters", index, (current) => ({
                              ...current,
                              src: value,
                            }))
                          }
                          uploading={uploadingField === `supporter-image-${index}`}
                          onUpload={(file) =>
                            handleUpload(
                              `supporter-image-${index}`,
                              "supporters",
                              (url) =>
                                updateArrayItem("supporters", index, (current) => ({
                                  ...current,
                                  src: url,
                                })),
                              file,
                            )
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>

            <TabsContent value="team_members">
              <SectionShell
                title="Team members"
                description="Edit the existing team roster or add new members. Social links are kept to Instagram, LinkedIn, and TikTok."
                onReset={() => handleResetSection("team_members")}
              >
                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={() => appendArrayItem("team_members", createEmptyTeamMember())}>
                    <Plus className="h-4 w-4" />
                    Add team member
                  </Button>
                </div>
                <div className="space-y-6">
                  {content.team_members.map((member, index) => (
                    <Card
                      key={member.id}
                      onDragOver={(eventValue) => {
                        eventValue.preventDefault();
                        if (teamDropTargetId !== member.id) {
                          setTeamDropTargetId(member.id);
                        }
                      }}
                      onDrop={() => {
                        if (!draggedTeamMemberId || draggedTeamMemberId === member.id) {
                          setDraggedTeamMemberId(null);
                          setTeamDropTargetId(null);
                          return;
                        }

                        const fromIndex = content.team_members.findIndex(
                          (currentMember) => currentMember.id === draggedTeamMemberId,
                        );

                        if (fromIndex !== -1) {
                          moveArrayItem("team_members", fromIndex, index);
                        }

                        setDraggedTeamMemberId(null);
                        setTeamDropTargetId(null);
                      }}
                      className={`rounded-[1.8rem] border-2 bg-white transition-colors ${
                        teamDropTargetId === member.id
                          ? "border-primary bg-[#fffef4]"
                          : "border-foreground"
                      } ${draggedTeamMemberId === member.id ? "opacity-70" : ""}`}
                    >
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            draggable
                            onDragStart={() => {
                              setDraggedTeamMemberId(member.id);
                              setTeamDropTargetId(member.id);
                            }}
                            onDragEnd={() => {
                              setDraggedTeamMemberId(null);
                              setTeamDropTargetId(null);
                            }}
                            className="mt-1 inline-flex cursor-grab items-center gap-2 rounded-full border-2 border-foreground bg-[#fff4a8] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground active:cursor-grabbing"
                          >
                            <GripVertical className="h-4 w-4" />
                            Drag
                          </div>
                          <div>
                            <CardTitle className="text-2xl">{member.name || `Team member ${index + 1}`}</CardTitle>
                            <CardDescription>
                              Update title, bio, headshot, and up to three social links. Drag cards to reorder the team.
                            </CardDescription>
                          </div>
                        </div>
                        <Button type="button" variant="outline" onClick={() => removeArrayItem("team_members", index)}>
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </CardHeader>
                      <CardContent className="grid gap-6 xl:grid-cols-[1fr_360px]">
                        <div className="grid gap-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <Input
                              value={member.name}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  name: eventValue.target.value,
                                  id: current.id || slugify(eventValue.target.value) || makeId("team"),
                                }))
                              }
                              placeholder="Name"
                            />
                            <Input
                              value={member.title}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  title: eventValue.target.value,
                                }))
                              }
                              placeholder="Role"
                            />
                          </div>
                          <Textarea
                            className="min-h-[140px]"
                            value={member.bio}
                            onChange={(eventValue) =>
                              updateArrayItem("team_members", index, (current) => ({
                                ...current,
                                bio: eventValue.target.value,
                              }))
                            }
                            placeholder="Bio"
                          />
                          <label className="inline-flex items-center gap-3 rounded-[1rem] border-2 border-foreground bg-[#fff8f2] px-4 py-3 text-sm font-medium text-foreground">
                            <input
                              type="checkbox"
                              checked={Boolean(member.founder)}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  founder: eventValue.target.checked,
                                }))
                              }
                              className="h-4 w-4 accent-primary"
                            />
                            Show founder tag
                          </label>
                          <div className="grid gap-4 md:grid-cols-3">
                            <Input
                              value={member.socials.instagram ?? ""}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  socials: {
                                    ...current.socials,
                                    instagram: eventValue.target.value,
                                  },
                                }))
                              }
                              placeholder="Instagram URL"
                            />
                            <Input
                              value={member.socials.linkedin ?? ""}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  socials: {
                                    ...current.socials,
                                    linkedin: eventValue.target.value,
                                  },
                                }))
                              }
                              placeholder="LinkedIn URL"
                            />
                            <Input
                              value={member.socials.tiktok ?? ""}
                              onChange={(eventValue) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  socials: {
                                    ...current.socials,
                                    tiktok: eventValue.target.value,
                                  },
                                }))
                              }
                              placeholder="TikTok URL"
                            />
                          </div>
                        </div>

                        <AssetField
                          label="Team photo"
                          value={member.photo}
                          onChange={(value) =>
                            updateArrayItem("team_members", index, (current) => ({
                              ...current,
                              photo: value,
                            }))
                          }
                          uploading={uploadingField === `team-photo-${index}`}
                          onUpload={(file) =>
                            handleUpload(
                              `team-photo-${index}`,
                              "team",
                              (url) =>
                                updateArrayItem("team_members", index, (current) => ({
                                  ...current,
                                  photo: url,
                                })),
                              file,
                            )
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </SectionShell>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
