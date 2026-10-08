/**
 * Where every dummy paper goes and what is meant to happen to it.
 *
 *   1-SEED     uploaded by you, with demo accounts, to populate the system
 *   2-TESTERS  handed to testers T01-T10, one folder each
 *   3-RESERVE  held back: Cycle 2 retests, and one file that is never uploaded
 *
 * Filenames stay pure titles: the submit form derives the title from the
 * filename, so any tag in the name would end up in the thesis title. The labels
 * live in the folders and the manifest instead.
 */

export interface Placement {
  title: string;
  folder: string;
  /** Account that submits it: a demo account (D1-D4) or a tester code. */
  owner: string;
  submitAs: "Draft" | "Final" | "Do not upload";
  /** Order within its bucket. For seed files, the order to upload in. */
  step: number;
  /** What should happen to it, in one line. */
  plan: string;
}

const SEED = "1-SEED";
const TEST = "2-TESTERS";
const RESERVE = "3-RESERVE";

/** Folder that holds the second manuscript for a returned Final. */
export const REVISION_SUBFOLDER = "IF-RETURNED-resubmit-with-this";

const PUBLISH = "Adviser endorses, librarian approves: PUBLISHED.";

export const PLACEMENTS: Placement[] = [
  // ---- 1-SEED ----------------------------------------------------------
  // 1-PUBLISH: seven records that end up public. Five are the originals the
  // near-duplicates imitate, so UAT-13 has something to match against.
  { title: "Hand Hygiene Compliance Among Nursing Students During Clinical Rotations", folder: `${SEED}/1-PUBLISH`, owner: "D1", submitAs: "Final", step: 1, plan: `${PUBLISH} Original for T05's alert-only near-duplicate.` },
  { title: "Design and Evaluation of a Mobile Queue Management App for a University Registrar Office", folder: `${SEED}/1-PUBLISH`, owner: "D2", submitAs: "Final", step: 2, plan: `${PUBLISH} Original for T01's near-duplicate.` },
  { title: "Low Cost Rainwater Harvesting System for Small Residential Buildings", folder: `${SEED}/1-PUBLISH`, owner: "D3", submitAs: "Final", step: 3, plan: `${PUBLISH} Original for T02's near-duplicate.` },
  { title: "Customer Loyalty Drivers of Neighborhood Coffee Shops", folder: `${SEED}/1-PUBLISH`, owner: "D4", submitAs: "Final", step: 4, plan: `${PUBLISH} Original for T03's near-duplicate.` },
  { title: "Awareness of Data Privacy Rights Among Online Sellers in Cebu City", folder: `${SEED}/1-PUBLISH`, owner: "D1", submitAs: "Final", step: 5, plan: `${PUBLISH} Original for T04's near-duplicate.` },
  { title: "Prevalence of Screen Related Eye Strain Among Call Center Employees", folder: `${SEED}/1-PUBLISH`, owner: "D1", submitAs: "Final", step: 6, plan: `${PUBLISH} Then D2 files a dispute on it, D1 replies, leave it OPEN.` },
  { title: "A Web Based Inventory System for Small Pharmacies", folder: `${SEED}/1-PUBLISH`, owner: "D2", submitAs: "Final", step: 7, plan: `${PUBLISH} Then D3 files a dispute, librarian RESOLVES it with a closing note.` },
  // 2-PUBLISH-then-FLAG
  { title: "Smart Contract Vulnerability Patterns in Student Built Token Projects", folder: `${SEED}/2-PUBLISH-then-FLAG`, owner: "D3", submitAs: "Final", step: 8, plan: `${PUBLISH} Then the librarian sets it to FLAGGED (UAT-20), you or the tester.` },
  // 3-STOP-at-librarian-queue
  { title: "Legal Remedies for Consumers in Online Marketplace Disputes", folder: `${SEED}/3-STOP-at-librarian-queue`, owner: "D4", submitAs: "Final", step: 9, plan: "Adviser endorses, then STOP. Sits in the librarian queue for UAT-19." },
  { title: "Solar Powered Irrigation Pump Design for Small Vegetable Farms", folder: `${SEED}/3-STOP-at-librarian-queue`, owner: "D1", submitAs: "Final", step: 10, plan: "Adviser endorses, then STOP. Sits in the librarian queue for UAT-19." },
  // 4-STOP-at-adviser-queue
  { title: "Parental Involvement and Reading Proficiency in Early Grades", folder: `${SEED}/4-STOP-at-adviser-queue`, owner: "D2", submitAs: "Final", step: 11, plan: "Choose adviser A1, then STOP. First item in A1's queue (UAT-16)." },
  { title: "Social Media Marketing Practices of Home Based Food Sellers", folder: `${SEED}/4-STOP-at-adviser-queue`, owner: "D3", submitAs: "Final", step: 12, plan: "Choose adviser A2, then STOP. First item in A2's queue (UAT-16)." },
  // 5-RETURN
  { title: "Coping Strategies of Working Students During Examination Periods", folder: `${SEED}/5-RETURN`, owner: "D4", submitAs: "Final", step: 13, plan: "Adviser RETURNS it with written comments. Leave it returned (no revision file)." },
  // 6-REJECT
  { title: "Color Symbolism in Festival Costume Design", folder: `${SEED}/6-REJECT`, owner: "D1", submitAs: "Final", step: 14, plan: "Adviser endorses, librarian REJECTS with comments. Must never show in public search (UAT-10)." },
  // 7-DRAFT
  { title: "Seasonal Variation of Water Quality in a Small Upland Stream", folder: `${SEED}/7-DRAFT`, owner: "D2", submitAs: "Draft", step: 15, plan: "Submit as Draft. Stays private (UAT-10)." },

  // ---- 2-TESTERS: students T01-T05 (Final + near-duplicate) -------------
  { title: "Anomaly Detection in Campus Network Traffic Using Unsupervised Learning", folder: `${TEST}/T01-student`, owner: "T01", submitAs: "Final", step: 1, plan: "Submit (UAT-05); re-upload same file to see the duplicate rejected (UAT-06). Adviser RETURNS it, then T01 resubmits the revision (UAT-17, 18)." },
  { title: "Design and Evaluation of a Mobile Queue Management Application for a University Registrar Office", folder: `${TEST}/T01-student`, owner: "T01", submitAs: "Final", step: 2, plan: "Near-duplicate: expect title alert AND auto-flag dispute (UAT-13). Librarian RESOLVES that dispute in UAT-15." },
  { title: "Effects of Gamified Quizzes on Grade 8 Mathematics Engagement", folder: `${TEST}/T02-student`, owner: "T02", submitAs: "Final", step: 1, plan: "Submit; duplicate re-upload test. Adviser RETURNS it, then T02 resubmits the revision." },
  { title: "Low Cost Rainwater Harvesting System for Small Residential Houses", folder: `${TEST}/T02-student`, owner: "T02", submitAs: "Final", step: 2, plan: "Near-duplicate: expect title alert AND auto-flag dispute. Leave the dispute open." },
  { title: "Antibacterial Activity of Guava Leaf Extract Against Common Skin Bacteria", folder: `${TEST}/T03-student`, owner: "T03", submitAs: "Final", step: 1, plan: "Submit; duplicate re-upload test. Adviser RETURNS it, then T03 resubmits the revision." },
  { title: "Customer Loyalty Drivers of Neighbourhood Coffee Shops", folder: `${TEST}/T03-student`, owner: "T03", submitAs: "Final", step: 2, plan: "Near-duplicate: expect title alert AND auto-flag dispute. Leave the dispute open." },
  { title: "Visual Storytelling in Contemporary Cebuano Zine Culture", folder: `${TEST}/T04-student`, owner: "T04", submitAs: "Final", step: 1, plan: "Submit; duplicate re-upload test. Adviser RETURNS it, then T04 resubmits the revision." },
  { title: "Awareness of Data Privacy Rights Among Online Sellers in Metro Cebu", folder: `${TEST}/T04-student`, owner: "T04", submitAs: "Final", step: 2, plan: "Near-duplicate: expect title alert AND auto-flag dispute. Leave the dispute open." },
  { title: "A Blockchain Based Attendance Verification System for Student Organizations", folder: `${TEST}/T05-student`, owner: "T05", submitAs: "Final", step: 1, plan: "Submit; duplicate re-upload test. Adviser ENDORSES, librarian approves: PUBLISHED. (No revision: not returned.)" },
  { title: "Hand Hygiene Compliance Among Medical Technology Students During Laboratory Rotations", folder: `${TEST}/T05-student`, owner: "T05", submitAs: "Final", step: 2, plan: "Near-duplicate, alert-only: expect a title alert but NO auto-flag dispute." },

  // ---- 2-TESTERS: faculty T06-T10 (Draft, then Final linked to it) --------
  { title: "Enforcement Gaps in Local Ordinances on Solid Waste Segregation", folder: `${TEST}/T06-faculty`, owner: "T06", submitAs: "Draft", step: 1, plan: "Submit as Draft first (UAT-07). Stays private." },
  { title: "Telehealth Follow Up Adherence Among Rural Patients With Type 2 Diabetes", folder: `${TEST}/T06-faculty`, owner: "T06", submitAs: "Final", step: 2, plan: "Submit as Final linked to the Draft (UAT-05, 12). Adviser endorses, librarian approves: PUBLISHED. Download certificate (UAT-11)." },
  { title: "Cash Flow Management Practices of Micro Enterprises After Digital Payment Adoption", folder: `${TEST}/T07-faculty`, owner: "T07", submitAs: "Draft", step: 1, plan: "Submit as Draft first (UAT-07). Stays private." },
  { title: "Teacher Workload and Instructional Quality in Public Elementary Schools", folder: `${TEST}/T07-faculty`, owner: "T07", submitAs: "Final", step: 2, plan: "Submit as Final linked to the Draft. Adviser endorses, librarian approves: PUBLISHED." },
  { title: "Remittance Dependence and Household Decision Making in Island Communities", folder: `${TEST}/T08-faculty`, owner: "T08", submitAs: "Draft", step: 1, plan: "Submit as Draft first (UAT-07). Stays private." },
  { title: "Structural Performance of Coconut Fiber Reinforced Concrete Hollow Blocks", folder: `${TEST}/T08-faculty`, owner: "T08", submitAs: "Final", step: 2, plan: "Submit as Final linked to the Draft. Adviser endorses, librarian approves: PUBLISHED." },
  { title: "Adaptive Reuse of Heritage Spaces as Community Art Venues", folder: `${TEST}/T09-faculty`, owner: "T09", submitAs: "Draft", step: 1, plan: "Submit as Draft first (UAT-07). Stays private." },
  { title: "Microplastic Concentration in Selected Visayan Coastal Sediments", folder: `${TEST}/T09-faculty`, owner: "T09", submitAs: "Final", step: 2, plan: "Submit as Final linked to the Draft. Adviser endorses, then leave in the librarian queue (UAT-19 is tested live)." },
  { title: "Consensus Overhead in Permissioned Ledgers for Academic Credential Sharing", folder: `${TEST}/T10-faculty`, owner: "T10", submitAs: "Draft", step: 1, plan: "Submit as Draft first (UAT-07). Stays private." },
  { title: "Youth Political Participation in the Age of Short Form Video", folder: `${TEST}/T10-faculty`, owner: "T10", submitAs: "Final", step: 2, plan: "Submit as Final linked to the Draft. Adviser endorses, librarian approves: PUBLISHED. Another tester disputes it (UAT-14)." },

  // ---- 3-RESERVE -------------------------------------------------------
  { title: "Noise Exposure and Concentration Among Students Living Near Busy Roads", folder: `${RESERVE}/SPARES`, owner: "unassigned", submitAs: "Final", step: 1, plan: "Spare for a Cycle 2 retest of a submission." },
  { title: "Barriers to Library Use Among First Year Engineering Students", folder: `${RESERVE}/SPARES`, owner: "unassigned", submitAs: "Final", step: 2, plan: "Spare for a Cycle 2 retest of a submission." },
  { title: "Usability Assessment of a Chatbot for Student Enrollment Inquiries", folder: `${RESERVE}/SPARES`, owner: "unassigned", submitAs: "Final", step: 3, plan: "Spare for a Cycle 2 retest of a submission." },
  { title: "Pricing Practices of Community Cooperatives Supplying Local Produce", folder: `${RESERVE}/SPARES`, owner: "unassigned", submitAs: "Final", step: 4, plan: "Spare for a Cycle 2 retest of a submission." },
  { title: "Preserving Oral Histories of Fishing Communities Through Digital Archives", folder: `${RESERVE}/SPARES`, owner: "unassigned", submitAs: "Final", step: 5, plan: "Spare for a Cycle 2 retest of a submission." },
  { title: "Perceived Travel Time Reliability Among Daily Jeepney Commuters", folder: `${RESERVE}/NEVER-UPLOAD`, owner: "nobody", submitAs: "Do not upload", step: 1, plan: "Public tester verifies this PDF and must get NO MATCH (UAT-09). Uploading it to the system ruins the test." },
];
