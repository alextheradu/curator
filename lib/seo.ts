import type { Metadata } from "next";
import { SITE_NAME, SITE_OG_IMAGE, SITE_URL, SITE_TITLE } from "@/lib/site";

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  keywords?: string[];
};

const SITE_IMAGE = [
  {
    url: SITE_OG_IMAGE,
    width: 1200,
    height: 630,
    alt: `${SITE_NAME} Open Graph Image`,
  },
];

export const NO_INDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

export const NO_INDEX_X_ROBOTS_TAG = "noindex, nofollow, noarchive, nosnippet, noimageindex";

const NON_SEARCH_INDEXED_ROUTE_PREFIXES = ["/admin", "/api", "/c", "/news", "/blog"] as const;

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSearchIndexablePath(pathname: string) {
  const rawPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  let normalizedPathname: string;
  try {
    normalizedPathname = decodeURIComponent(rawPathname);
  } catch {
    return false;
  }

  return !NON_SEARCH_INDEXED_ROUTE_PREFIXES.some((prefix) => matchesPathPrefix(normalizedPathname, prefix));
}

export function buildPublicPageMetadata({
  title,
  description,
  path,
  keywords,
}: PublicPageMetadataOptions): Metadata {
  const isHomePage = path === "/";
  const socialTitle = isHomePage ? SITE_TITLE : `${title} | ${SITE_NAME}`;
  const url = isHomePage ? SITE_URL : new URL(path, SITE_URL).toString();

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
      images: SITE_IMAGE,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [SITE_OG_IMAGE],
    },
  };
}
