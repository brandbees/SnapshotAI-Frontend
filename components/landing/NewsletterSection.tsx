"use client";
import { useState } from "react";
import { Send, CheckCircle, Mail } from "lucide-react";
import { useInView } from "./hooks";

export function NewsletterSection() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView(0.2);

  const handleSubmit = async (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setSent(true);
    setLoading(false);
  };

  return (
    <section className="py-20 bg-slate-50 border-t border-gray-200">
      <div ref={ref} className="max-w-2xl mx-auto px-4 sm:px-6 text-center">

        {/* Icon */}
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-100 border border-sky-200 mb-6 transition-all duration-500 ${
            inView ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <Mail size={20} className="text-sky-600" />
        </div>

        <p
          className={`text-xs font-semibold uppercase tracking-widest text-sky-600 mb-3 transition-all duration-500 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          Agency newsletter
        </p>

        <h2
          className={`text-3xl font-black text-gray-900 mb-3 transition-all duration-500 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          WordPress tips for agencies,
          <br />
          <span className="text-sky-600">straight to your inbox.</span>
        </h2>

        <p
          className={`text-gray-500 text-base mb-8 leading-relaxed transition-all duration-500 ${
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          Monthly insights on WordPress security, performance, client management, and agency growth. Read by 2,400+ agency owners. No spam — ever.
        </p>

        {sent ? (
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 animate-scale-in">
            <CheckCircle size={20} />
            <span className="font-semibold text-sm">You&apos;re subscribed! Check your inbox.</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={`flex flex-col sm:flex-row gap-3 max-w-md mx-auto transition-all duration-500 ${
              inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@agency.com"
              required
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/15 transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all disabled:opacity-70 shrink-0 shadow-sm shadow-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-1"
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
