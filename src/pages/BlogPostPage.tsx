import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getPost } from "../data/blogPosts";
import BlogPage from "./BlogPage";
import { useSeo } from "../lib/seo";
import { breadcrumbJsonLd } from "../lib/jsonld";

/** A single blog post at /blog/<slug>. Falls back to the index for unknown slugs. */
export default function BlogPostPage({ slug }: { slug: string }) {
  const post = getPost(slug);
  if (!post) return <BlogPage />;

  const url = `https://unbricksol.com/blog/${post.slug}`;
  useSeo({
    title: `${post.title} | UnbrickSOL`,
    description: post.description,
    canonical: url,
    type: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: "UnbrickSOL" },
        publisher: {
          "@type": "Organization",
          name: "UnbrickSOL",
          logo: { "@type": "ImageObject", url: "https://unbricksol.com/logo.png" },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        image: "https://unbricksol.com/og.png",
      },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ]),
    ],
  });

  const { Body } = post;
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <a href="/blog" className="font-mono text-xs text-muted hover:text-ink transition">← All guides</a>
        <article className="mt-6">
          <div className="font-mono text-xs text-faint">
            <time dateTime={post.date}>{post.dateLabel}</time> · {post.readMins} min read
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl mt-3 leading-tight">{post.title}</h1>
          <div className="mt-8">
            <Body />
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
