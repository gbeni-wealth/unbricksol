import { useState } from "react";
import { FAQS } from "../data/faq";

/** On-page FAQ accordion: answers collapsed until a question is clicked. The answer
 *  text stays in the DOM (just visually collapsed) so crawlers and LLMs still read it.
 *  Mirrors the FAQPage JSON-LD emitted via useSeo. Used on the home page and /faq. */
export function FaqSection({ heading = true }: { heading?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-14">
      {heading && (
        <>
          <div className="font-mono text-xs tracking-[0.16em] uppercase text-sol">FAQ</div>
          <h2 className="font-display font-bold text-2xl sm:text-3xl mt-2 leading-tight">
            Excess SOL recovery, answered.
          </h2>
        </>
      )}
      <div className="mt-8 flex flex-col gap-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}
              className={`rounded-2xl bg-panel hairline overflow-hidden transition-colors ${isOpen ? "border-sol/40" : ""}`}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 group">
                <h3 className="font-display font-semibold text-base sm:text-lg group-hover:text-sol transition-colors">
                  {f.q}
                </h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-sol transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {/* grid-rows trick animates height; answer stays in DOM for SEO/LLMs */}
              <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <p className="text-muted leading-relaxed px-5 pb-5">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
