import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;       // path, e.g. '/vijesti/abc'
  ogImage?: string;
  ogType?: 'website' | 'article' | 'event';
  keywords?: string;
  author?: string;
  publishedAt?: string;
  modifiedAt?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}

const SITE_NAME = 'Gradačac Mapa';
const SITE_BASE = import.meta.env.VITE_CANONICAL_BASE || '';

function buildCanonical(path?: string) {
  if (!path) return SITE_BASE + (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + '/';
  return SITE_BASE + (import.meta.env.BASE_URL?.replace(/\/$/, '') || '') + path;
}

export default function SEOHead({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  keywords,
  author,
  publishedAt,
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} - Digitalni vodič kroz grad`;
  const canonicalUrl = buildCanonical(canonical);
  const defaultDesc = 'Sve o Gradačacu na jednom mjestu — restorani, marketi, događaji, znamenitosti, hitni brojevi i gradske vijesti.';
  const metaDesc = description || defaultDesc;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      {noindex
        ? <meta name="robots" content="noindex,nofollow" />
        : <meta name="robots" content="index,follow" />}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content="bs_BA" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}
      {ogImage && <meta property="og:image:alt" content={fullTitle} />}
      {publishedAt && <meta property="article:published_time" content={publishedAt} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])}
        </script>
      )}
    </Helmet>
  );
}
