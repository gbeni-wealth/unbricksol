import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, ORG_JSONLD, abs } from "./site";
import { FAQS } from "../data/faq";

// schema.org graphs. Emitted as a single <script type="application/ld+json"> per page
// via useSeo - real HTML after prerender, so both Google and LLMs can read them.

const faqEntity = () => ({
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const homeJsonLd = () => ({
  "@context": "https://schema.org",
  "@graph": [
    ORG_JSONLD,
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    faqEntity(),
  ],
});

export const faqJsonLd = () => ({ "@context": "https://schema.org", ...faqEntity() });

export const breadcrumbJsonLd = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.name,
    item: abs(t.path),
  })),
});
