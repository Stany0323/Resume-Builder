import { ProseField } from "./fields";

/**
 * Summary sits at the top of every template, so it is the first thing a reader
 * sees and the field people most often leave weak. Advisory guidance only —
 * never blocking, never red.
 */

/* Rough guidance, not rules. Three or four sentences is the shape that reads
   well at the top of a page without eating space the experience needs. */
const BARELY_STARTED_WORDS = 8;
const SHORT_WORDS = 25;
const LONG_WORDS = 90;

export function SummaryPanel({
  onChange,
  text,
}: {
  onChange: (text: string) => void;
  text: string;
}) {
  const trimmed = text.trim();

  if (trimmed === "") {
    return (
      <>
        <p className="form-note">
          Three or four sentences. What you do, how long you’ve done it, and the thing you’re best at.
        </p>
        <ProseField label="Summary" onChange={onChange} rows={5} value={text} />
      </>
    );
  }

  const words = trimmed.split(/\s+/).length;

  return (
    <>
      <ProseField
        advisory={`${words} ${words === 1 ? "word" : "words"}`}
        label="Summary"
        onChange={onChange}
        rows={5}
        value={text}
      />
      <SummaryAdvice text={trimmed} words={words} />
    </>
  );
}

function SummaryAdvice({ text, words }: { text: string; words: number }) {
  const advice = adviseOnSummary(text, words);

  if (!advice) {
    return null;
  }

  return (
    <p className="advisory" role="status">
      {advice}
    </p>
  );
}

/**
 * Returns at most one piece of advice — a stack of hints reads as nagging.
 *
 * Order matters: a specific, fixable problem beats a length note. A 22-word
 * summary written in the first person should be told about the "I", not that
 * it's a little short, because that's the more actionable of the two.
 */
export function adviseOnSummary(text: string, words: number): string | null {
  // Below this there isn't enough text for style advice to be meaningful.
  if (words < BARELY_STARTED_WORDS) {
    return "Keep going — a summary needs a sentence or two to do any work.";
  }

  if (FIRST_PERSON.test(text)) {
    return "Résumé summaries usually drop “I” — “Product manager with eight years…” rather than “I am a product manager…”.";
  }

  if (SEEKING.test(text)) {
    return "Leading with what you’re looking for is weaker than leading with what you’ve done.";
  }

  if (words > LONG_WORDS) {
    return `${words} words is long for a summary — it pushes your experience down the page. Aim for around 60.`;
  }

  if (words < SHORT_WORDS) {
    return "A little short. One more sentence on what you actually do would help.";
  }

  if (!/\d/.test(text)) {
    return "No numbers here. Years of experience, team size, or scale gives a reader something concrete.";
  }

  return null;
}

const FIRST_PERSON = /\b(?:I|I'm|I’m|I am|my|My)\b/;
const SEEKING = /\b(?:seeking|looking for|hoping to|aspiring|in search of)\b/i;
