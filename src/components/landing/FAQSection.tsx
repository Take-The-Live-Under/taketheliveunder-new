"use client";

import { motion } from "framer-motion";

const faqItems = [
  {
    question: "How does TakeTheLiveUnder actually work?",
    answer:
      "We track live NCAA basketball games and crunch the numbers in real-time. When the pace of the game suggests the final score will land under the line, we flag it with a Golden Zone alert and give you a confidence score so you know how strong the signal is.",
  },
  {
    question: "Do I need to understand stats or analytics?",
    answer:
      "Not at all. We designed the dashboard for regular sports fans, not data scientists. You see a game, a signal (Golden Zone or not), and a confidence score. Green means strong, yellow means worth watching. That's it.",
  },
  {
    question: "What is the Golden Zone?",
    answer:
      "The Golden Zone is our signature alert. It fires when the game pace and score trends strongly favor the under. Think of it as a heads-up that the numbers are in your corner -- it's not a guarantee, but it's a well-informed signal.",
  },
  {
    question: "Does this guarantee I'll win?",
    answer:
      "No tool can guarantee that. Sports are unpredictable -- that's what makes them exciting. TakeTheLiveUnder gives you an edge by surfacing real-time insights, but the final call is always yours.",
  },
  {
    question: "What games do you cover?",
    answer:
      "We cover NCAA Division I men's basketball -- every regular season game, conference tournaments, and the big dance (March Madness). If it's being played, we're watching it.",
  },
  {
    question: "How often does the data refresh?",
    answer:
      "Every 15 seconds during live games. That's fast enough to catch momentum shifts as they happen, but smooth enough that you're not overwhelmed by a firehose of numbers.",
  },
  {
    question: "Is this connected to the NCAA?",
    answer:
      "No. TakeTheLiveUnder is a fully independent analytics product. We are not affiliated with, endorsed by, or connected to the NCAA or any college athletics program.",
  },
];

export function FAQSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            Got questions?
          </h2>
          <p className="text-neutral-400 text-lg">
            We've got answers. Here's what people usually ask.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          {faqItems.map((item, index) => (
            <details
              key={index}
              className="group border border-neutral-800/60 rounded-lg bg-neutral-900/20 hover:bg-neutral-900/40 transition-colors pointer-events-auto"
            >
              <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-base font-medium text-white hover:text-orange-300 transition-colors list-none">
                <span className="text-left">{item.question}</span>
                <svg
                  className="w-5 h-5 text-neutral-500 transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="px-6 pb-5 text-neutral-400 leading-relaxed border-t border-neutral-800/30 pt-4">
                {item.answer}
              </div>
            </details>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
