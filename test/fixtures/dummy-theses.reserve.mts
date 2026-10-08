/**
 * Reserve papers for the UAT: spares, the "never upload" verify file, and the
 * revision manuscripts. Same rules as dummy-theses.data.mts: everything here is
 * invented, and every generated PDF says so on each page.
 */
import type { DummyThesis } from "./dummy-theses.data.mts";

/**
 * Distinct titles held back for Cycle 2 retests. A retest of a submission needs
 * a fresh file, since a hash can be registered only once.
 */
export const SPARES: DummyThesis[] = [
  {
    group: "spare",
    title: "Noise Exposure and Concentration Among Students Living Near Busy Roads",
    level: "undergraduate",
    category: "Science",
    type: "Final",
    audience: "Reserve",
    keywords: ["noise exposure", "concentration", "students", "urban environment"],
    abstract:
      "This fictitious thesis investigates whether regular exposure to road noise at home is related to difficulty concentrating among university students. An invented sample of students living along busy roads and on quieter streets completed a short attention task and a questionnaire on sleep and study habits, while evening noise levels were measured outside each residence. The imagined results show a small but consistent link between louder surroundings and lower task accuracy, partly explained by poorer sleep. Students with window insulation or access to a quiet study space were less affected. The study suggests low cost noise reduction measures and campus study spaces that students can use in the evening.",
  },
  {
    group: "spare",
    title: "Barriers to Library Use Among First Year Engineering Students",
    level: "undergraduate",
    category: "Education",
    type: "Final",
    audience: "Reserve",
    keywords: ["library use", "engineering students", "information seeking", "first year"],
    abstract:
      "This invented thesis explores why first year engineering students rarely use the university library even when their courses require reading beyond the textbook. A survey and a handful of interviews were imagined, covering opening hours, unfamiliarity with search tools, the location of engineering materials, and a preference for online sources. The fictional findings show that students were unsure how to find technical standards and journal articles and often felt the library was meant for other programs. Those who attended a short orientation used the library noticeably more. The study recommends embedding a library session in the first semester and extending evening access during examination weeks.",
  },
  {
    group: "spare",
    title: "Usability Assessment of a Chatbot for Student Enrollment Inquiries",
    level: "undergraduate",
    category: "Technology",
    type: "Final",
    audience: "Reserve",
    keywords: ["chatbot", "usability", "enrollment", "student services"],
    abstract:
      "This fictitious capstone project evaluates the usability of a text chatbot built to answer common enrollment questions at a university. The invented chatbot handles questions on requirements, schedules, and fees using a small set of curated answers and hands off to a staff member when it is unsure. A group of student volunteers was imagined to complete typical tasks and rate the experience. The made up results show that most routine questions were answered correctly on the first try, while unusual or multi part questions often needed a hand off. Satisfaction was good overall. The paper lists wording problems found during testing and proposes a review cycle where staff update the answers each term.",
  },
  {
    group: "spare",
    title: "Pricing Practices of Community Cooperatives Supplying Local Produce",
    level: "masteral",
    category: "Business",
    type: "Final",
    audience: "Reserve",
    keywords: ["pricing", "cooperatives", "local produce", "farmer income"],
    abstract:
      "This invented study describes how community cooperatives set prices for the vegetables and fruit they supply to local markets and institutions. Interviews with cooperative officers and a review of sample price lists were imagined, covering cost recovery, bargaining with buyers, seasonal swings, and the treatment of member farmers. The fictional findings show that most cooperatives price by following the nearest market rather than by their own costs, which leaves little margin in the lean season. Cooperatives that kept simple cost records and agreed on floor prices with regular buyers reported steadier member income. The study recommends basic costing training and shared price agreements with schools and hospitals.",
  },
  {
    group: "spare",
    title: "Preserving Oral Histories of Fishing Communities Through Digital Archives",
    level: "masteral",
    category: "Social Sciences",
    type: "Final",
    audience: "Reserve",
    keywords: ["oral history", "fishing communities", "digital archive", "cultural heritage"],
    abstract:
      "This fictitious study considers how the spoken histories of fishing communities can be recorded and kept in a digital archive that the communities themselves can use. An invented project was imagined in which elders were interviewed about changing seasons, boat building, and local beliefs, and the recordings were cataloged with plain language descriptions. The made up findings show that elders were willing to share when interviews were held in familiar places and in the local language, and that younger residents valued hearing the recordings. Concerns about ownership and sensitive stories were raised. The study proposes community consent rules, simple storage practices, and a local access point for the collection.",
  },
];

/** Valid and submittable, but deliberately never uploaded: the "no match" case of UAT-09. */
export const VERIFY_NO_MATCH: DummyThesis = {
  group: "verify",
  title: "Perceived Travel Time Reliability Among Daily Jeepney Commuters",
  level: "undergraduate",
  category: "Social Sciences",
  type: "Final",
  audience: "Reserve",
  keywords: ["commuting", "travel time", "public transport", "reliability"],
  abstract:
    "This fictitious thesis asks how reliable daily jeepney commuters find their travel times and how that perception affects their planning. An invented survey of commuters on several routes covered usual departure times, how often they arrived late, buffer time added to trips, and stress felt while waiting. The imagined results suggest that commuters on routes with irregular intervals add substantial buffer time and report higher stress, even when the average trip length is similar to other routes. Commuters who could check vehicle availability through group chats felt more in control. The study recommends posted schedules at major stops and shared information channels among drivers and commuters.",
};

export interface Revision {
  /** Title of the tester Final this file replaces (same title, new manuscript). */
  of: string;
  keywords: string[];
  /** Reworked abstract, answering the kind of comments an adviser would give. */
  abstract: string;
}

/** Second manuscripts for UAT-18: the identical file is rejected, so these differ. */
export const REVISIONS: Revision[] = [
  {
    of: "Anomaly Detection in Campus Network Traffic Using Unsupervised Learning",
    keywords: ["anomaly detection", "network traffic", "unsupervised learning", "campus network"],
    abstract:
      "This revised, fictitious manuscript explores whether unsupervised learning can flag unusual activity in campus network traffic without labeled attack data. Responding to reviewer comments, the invented study now states its simulated data source, reports how injected scanning and exfiltration events were generated, and adds a comparison of isolation based and clustering based detectors with alarm rates at several sensitivity settings. The made up results show that the isolation approach found most injected events at a manageable false alarm rate, while clustering confused bursty but harmless traffic with attacks. A new limitations section explains why results on simulated flows may not carry over to a live network and outlines a replay test with public captures.",
  },
  {
    of: "Effects of Gamified Quizzes on Grade 8 Mathematics Engagement",
    keywords: ["gamification", "mathematics", "student engagement", "junior high school"],
    abstract:
      "This revised, fictitious manuscript examines whether short gamified quizzes raise engagement among Grade 8 mathematics learners. Following adviser comments, the invented study now describes how the two sections were chosen, reports their starting performance, and explains the observation checklist used to score engagement. The imagined results show higher on task behavior and more voluntary practice in the gamified section over six weeks, with small and statistically uncertain differences in unit test scores. A new discussion addresses novelty effects and the discouraging effect of public leaderboards, and the revised recommendations suggest team based points and a repeat study over a full grading period.",
  },
  {
    of: "Antibacterial Activity of Guava Leaf Extract Against Common Skin Bacteria",
    keywords: ["guava leaf", "plant extract", "antibacterial", "skin bacteria"],
    abstract:
      "This revised, fictitious manuscript screens an ethanol extract of guava leaves for antibacterial activity against bacteria commonly found on human skin. In answer to reviewer comments, the invented study now documents how leaves were collected and extracted, adds replicate measurements for every concentration, and includes a positive control with a standard antibiotic and a solvent control. The imagined results show clear inhibition zones at higher concentrations, smaller zones at lower ones, and none in the solvent control, with consistent values across replicates. Phytochemical screening indicated tannins and flavonoids. The revised conclusion stresses that inhibition in a dish does not show safety or effect on skin, and calls for toxicity testing.",
  },
  {
    of: "Visual Storytelling in Contemporary Cebuano Zine Culture",
    keywords: ["zines", "visual storytelling", "Cebuano", "independent publishing"],
    abstract:
      "This revised, fictitious manuscript looks at how young creators use images, layout, and local language to tell stories in self published zines. Following adviser comments, the invented study now explains how its collection of zines was assembled, defines the visual devices it codes, such as hand drawn lettering, collage, and panel breaks, and adds a consent procedure for the interviewed makers. The imagined findings show recurring themes of city life, family, and migration, and suggest that zines act as small archives of everyday experience. A new section compares print zines with social media posts on the same themes, and the revision closes with a plan to document the collection with permission from the makers.",
  },
];
