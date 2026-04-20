import { Helmet } from "react-helmet-async";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  TWITTER_HANDLE
} from "@/lib/seo";

type SeoProps = {
  title?: string;
  description?: string;
  pathname?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

const Seo = ({
  title,
  description,
  pathname,
  image,
  type = "website",
  noIndex = false
}: SeoProps) => {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const pageDescription = description || DEFAULT_DESCRIPTION;
  const canonicalUrl = pathname ? `${SITE_URL}${pathname}` : SITE_URL;
  const imageUrl = image || DEFAULT_IMAGE;
  const robots = noIndex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pageTitle,
    description: pageDescription,
    url: canonicalUrl,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL
    }
  };

  const breadcrumbLabelMap: Record<string, string> = {
    "/": "Home",
    "/events": "Events",
    "/about": "About",
    "/get-involved": "Get Involved",
    "/curriculum": "Curriculum",
    "/kits": "Kits",
    "/contact": "Contact",
    "/partners": "Get Involved",
    "/donations": "Get Involved",
    "/team": "About",
    "/courses": "Curriculum",
  };

  const getBreadcrumbLabel = () => {
    if (!pathname) {
      return "Home";
    }

    if (breadcrumbLabelMap[pathname]) {
      return breadcrumbLabelMap[pathname];
    }

    if (title) {
      return title;
    }

    return pathname
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean)
      .join(" ")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const breadcrumbLabel = getBreadcrumbLabel();
  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`
      },
      ...(pathname && pathname !== "/"
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: breadcrumbLabel,
              item: canonicalUrl
            }
          ]
        : [])
    ]
  };

  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL
  };

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <link rel="canonical" href={canonicalUrl} />
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={robots} />
      <meta name="author" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />

      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={`${SITE_NAME} logo`} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={`${SITE_NAME} logo`} />

      {!noIndex && (
        <>
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
          <script type="application/ld+json">{JSON.stringify(webSiteSchema)}</script>
          <script type="application/ld+json">{JSON.stringify(breadcrumbList)}</script>
        </>
      )}
    </Helmet>
  );
};

export default Seo;
