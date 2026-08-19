/**
 * Citation formatting tests. Run with `npm run test:citation`.
 *
 * The name-parsing cases carry the weight here: a wrong style separator is
 * obvious on sight, but a mangled surname is not, and Philippine surnames with
 * particles are the common case in this registry rather than an edge one.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseName,
  formatCitation,
  formatAllCitations,
  CITATION_STYLES,
  INSTITUTION,
  type CitationSource,
} from "../lib/citation.ts";

const base: CitationSource = {
  title: "Blockchain-Based Registry Platforms for Academic Theses",
  authors: ["Juan Dela Cruz"],
  year: 2026,
  level: "undergraduate",
  url: "https://alexandria.uspf.edu.ph/thesis/abc-123",
};

const source = (over: Partial<CitationSource> = {}): CitationSource => ({
  ...base,
  ...over,
});

describe("parseName", () => {
  it("keeps a single-particle surname together", () => {
    assert.deepEqual(parseName("Juan Dela Cruz"), {
      given: ["Juan"],
      surname: "Dela Cruz",
      suffix: null,
    });
  });

  it("keeps a multi-token particle surname together", () => {
    assert.deepEqual(parseName("Maria de los Santos"), {
      given: ["Maria"],
      surname: "de los Santos",
      suffix: null,
    });
  });

  it("treats every non-final token as a given name when no particle appears", () => {
    assert.deepEqual(parseName("Jose Protacio Rizal"), {
      given: ["Jose", "Protacio"],
      surname: "Rizal",
      suffix: null,
    });
  });

  it("reads a lone token as a surname rather than inventing a given name", () => {
    assert.deepEqual(parseName("Madonna"), {
      given: [],
      surname: "Madonna",
      suffix: null,
    });
  });

  it("reads a bare particle surname whole", () => {
    assert.deepEqual(parseName("Dela Cruz"), {
      given: [],
      surname: "Dela Cruz",
      suffix: null,
    });
  });

  it("separates a generational suffix from the surname", () => {
    assert.deepEqual(parseName("Juan Dela Cruz Jr."), {
      given: ["Juan"],
      surname: "Dela Cruz",
      suffix: "Jr.",
    });
  });

  it("accepts an already-inverted name", () => {
    assert.deepEqual(parseName("Dela Cruz, Juan P."), {
      given: ["Juan", "P."],
      surname: "Dela Cruz",
      suffix: null,
    });
  });

  it("survives empty and whitespace-only input", () => {
    assert.deepEqual(parseName("   "), { given: [], surname: "", suffix: null });
  });
});

describe("APA 7", () => {
  const apa = (over: Partial<CitationSource> = {}) =>
    formatCitation(source(over), "apa").text;

  it("inverts the author to initials and brackets the designation", () => {
    assert.equal(
      apa(),
      `Dela Cruz, J. (2026). Blockchain-Based Registry Platforms for Academic Theses [Undergraduate thesis, ${INSTITUTION}]. Alexandria. https://alexandria.uspf.edu.ph/thesis/abc-123`,
    );
  });

  it("joins two authors with an ampersand", () => {
    const text = apa({ authors: ["Juan Dela Cruz", "Maria de los Santos"] });
    assert.match(text, /^Dela Cruz, J\., & de los Santos, M\. \(2026\)\./);
  });

  it("uses a serial comma before the ampersand for three authors", () => {
    const text = apa({
      authors: ["Juan Dela Cruz", "Maria de los Santos", "Jose Protacio Rizal"],
    });
    assert.match(text, /^Dela Cruz, J\., de los Santos, M\., & Rizal, J\. P\. \(2026\)\./);
  });

  it("carries the generational suffix after the initials", () => {
    assert.match(apa({ authors: ["Juan Dela Cruz Jr."] }), /^Dela Cruz, J\., Jr\. \(2026\)\./);
  });

  it("names the doctoral designation a dissertation", () => {
    assert.match(apa({ level: "doctoral" }), /\[Doctoral dissertation, /);
  });

  it("moves the title into the author position when nobody is credited", () => {
    const text = apa({ authors: [] });
    assert.match(text, /^Blockchain-Based Registry Platforms for Academic Theses \[/);
    assert.match(text, /\. \(2026\)\. Alexandria\./);
  });
});

describe("MLA 9", () => {
  const mla = (over: Partial<CitationSource> = {}) =>
    formatCitation(source(over), "mla").text;

  it("inverts a single author and spells the given name in full", () => {
    assert.equal(
      mla(),
      `Dela Cruz, Juan. Blockchain-Based Registry Platforms for Academic Theses. 2026. ${INSTITUTION}, undergraduate thesis. Alexandria, https://alexandria.uspf.edu.ph/thesis/abc-123.`,
    );
  });

  it("inverts only the first of two authors", () => {
    const text = mla({ authors: ["Juan Dela Cruz", "Maria de los Santos"] });
    assert.match(text, /^Dela Cruz, Juan, and Maria de los Santos\./);
  });

  it("collapses three or more authors to et al.", () => {
    const text = mla({
      authors: ["Juan Dela Cruz", "Maria de los Santos", "Jose Protacio Rizal"],
    });
    assert.match(text, /^Dela Cruz, Juan, et al\./);
  });
});

describe("Chicago", () => {
  const chicago = (over: Partial<CitationSource> = {}) =>
    formatCitation(source(over), "chicago").text;

  it("quotes the title and abbreviates a doctoral thesis", () => {
    assert.equal(
      chicago({ level: "doctoral" }),
      `Dela Cruz, Juan. "Blockchain-Based Registry Platforms for Academic Theses." PhD diss., ${INSTITUTION}, 2026. https://alexandria.uspf.edu.ph/thesis/abc-123.`,
    );
  });

  it("lists all three authors before falling back to et al.", () => {
    const text = chicago({
      authors: ["Juan Dela Cruz", "Maria de los Santos", "Jose Protacio Rizal"],
    });
    assert.match(
      text,
      /^Dela Cruz, Juan, Maria de los Santos, and Jose Protacio Rizal\./,
    );
  });

  it("collapses four authors to et al.", () => {
    const text = chicago({
      authors: ["Juan Dela Cruz", "Maria de los Santos", "Jose Protacio Rizal", "Andres Bonifacio"],
    });
    assert.match(text, /^Dela Cruz, Juan, et al\./);
  });
});

describe("title punctuation", () => {
  it("keeps a question mark and does not add a full stop after it", () => {
    const q = source({ title: "Can Blockchain Secure Academic Records?" });

    assert.match(
      formatCitation(q, "mla").text,
      /Can Blockchain Secure Academic Records\? 2026\./,
    );
    assert.match(
      formatCitation(q, "chicago").text,
      /"Can Blockchain Secure Academic Records\?" /,
    );
  });

  it("does not double a full stop the title already carries", () => {
    const dotted = source({ title: "A Study of Registries." });
    assert.match(formatCitation(dotted, "chicago").text, /"A Study of Registries\." /);
    assert.doesNotMatch(formatCitation(dotted, "chicago").text, /\.\."/);
  });
});

describe("rich-text output", () => {
  it("italicises the title in APA and MLA but not Chicago", () => {
    const [apa, mla, chicago] = formatAllCitations(source());

    assert.match(apa.html, /<em>Blockchain-Based Registry Platforms for Academic Theses<\/em>/);
    assert.match(mla.html, /<em>Blockchain-Based Registry Platforms for Academic Theses<\/em>/);
    assert.doesNotMatch(chicago.html, /<em>/);
  });

  it("escapes markup that arrives in the metadata", () => {
    const nasty = source({ title: "Ethics & <script>alert(1)</script> in Research" });
    const { html, text } = formatCitation(nasty, "apa");

    assert.match(html, /Ethics &amp; &lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    // The plain flavour is never injected as markup, so it stays verbatim.
    assert.match(text, /Ethics & <script>/);
  });
});

describe("formatAllCitations", () => {
  it("returns every advertised style, in order, with its label", () => {
    const all = formatAllCitations(source());

    assert.deepEqual(
      all.map((c) => c.style),
      CITATION_STYLES.map((s) => s.id),
    );
    assert.deepEqual(
      all.map((c) => c.label),
      ["APA 7th", "MLA 9th", "Chicago"],
    );
    for (const citation of all) {
      assert.ok(citation.text.includes(base.url), `${citation.style} omits the permalink`);
    }
  });
});
