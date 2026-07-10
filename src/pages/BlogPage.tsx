import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { BLOG_POSTS } from "../data/blogPosts";
import { useSeo } from "../lib/seo";

/** Blog index at /blog — lists posts. */
export default function BlogPage() {
  useSeo({
    title: "UnbrickSOL Blog — Recovering Excess SOL on Solana",
    description:
      "Guides on excess SOL, SIMD-0266, and recovering lamports stuck in Solana token mint accounts — safely and non-custodially.",
    canonical: "https://unbricksol.com/blog",
  });

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-6 pt-10 pb-16">
        <a href="/" className="font-mono text-xs text-muted hover:text-ink transition">← Back to UnbrickSOL</a>
        <h1 className="font-display font-bold text-3xl sm:text-4xl mt-6">Blog</h1>
        <p className="text-muted mt-2">
          Plain-English guides on excess SOL recovery for Solana token creators.
        </p>

        <div className="mt-10 divide-y divide-line">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="py-7">
              <a href={`/blog/${post.slug}`} className="group block">
                <div className="font-mono text-xs text-faint">
                  <time dateTime={post.date}>{post.dateLabel}</time> · {post.readMins} min read
                </div>
                <h2 className="font-display font-bold text-xl mt-2 group-hover:text-sol transition leading-snug">
                  {post.title}
                </h2>
                <p className="text-muted text-sm mt-2 leading-relaxed">{post.description}</p>
                <span className="inline-block mt-3 font-mono text-xs text-sol">Read guide →</span>
              </a>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
