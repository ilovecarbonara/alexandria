/**
 * Invented manuscripts for user-testing Alexandria. Nothing here describes a
 * real study: titles, findings, and abstracts are made up, and every generated
 * PDF says so on each page. Do not replace these with text from real papers.
 *
 * Titles double as filenames, so they avoid characters Windows rejects
 * (: ? " / \ * < > |) and satisfy `validateTitle` (<=150 chars, no runs of
 * special characters). `build-dummy-theses.mts` checks the title-similarity
 * relationships described below.
 */

export type Level = "undergraduate" | "masteral" | "doctoral";
export type Category =
  | "Medical"
  | "Technology"
  | "Education"
  | "Law"
  | "Engineering"
  | "Blockchain"
  | "Business"
  | "Science"
  | "Arts"
  | "Social Sciences";

export interface DummyThesis {
  /** Subfolder the PDF is written to. */
  group: "core" | "near-duplicate" | "extra";
  title: string;
  level: Level;
  category: Category;
  /** Suggested submission type in the Alexandria form. */
  type: "Draft" | "Final";
  /** Which tester cohort the file is meant for. */
  audience: "Student researcher" | "Faculty researcher" | "Demo seed";
  keywords: string[];
  abstract: string;
  /** Near-duplicates only: the `title` this one imitates and what to expect. */
  imitates?: string;
  expect?: "auto-flag" | "alert-only";
  note?: string;
}

export const CORE: DummyThesis[] = [
  // ---- Medical -----------------------------------------------------------
  {
    group: "core",
    title: "Hand Hygiene Compliance Among Nursing Students During Clinical Rotations",
    level: "undergraduate",
    category: "Medical",
    type: "Final",
    audience: "Student researcher",
    keywords: ["hand hygiene", "nursing students", "infection control", "clinical rotation"],
    abstract:
      "This fictitious study looks at how consistently nursing students follow hand hygiene steps while on clinical rotation in a teaching hospital setting. Using a descriptive cross-sectional design, the invented research team observed one hundred and twenty students across three ward types and compared observed practice with self-reported habits. The made-up results suggest that compliance was highest before patient contact and lowest after touching the patient surroundings, and that self-reports overstated actual practice. Time pressure and uneven access to sanitizer stations were the most common reasons given for missed steps. The study recommends point-of-care reminders and routine peer observation during orientation.",
  },
  {
    group: "core",
    title: "Telehealth Follow-Up Adherence Among Rural Patients With Type 2 Diabetes",
    level: "doctoral",
    category: "Medical",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["telehealth", "type 2 diabetes", "treatment adherence", "rural health"],
    abstract:
      "This invented dissertation examines whether scheduled video and phone follow-ups improve treatment adherence among rural adults living with type 2 diabetes. A sequential explanatory mixed-methods design was imagined, pairing a twelve-month cohort comparison with interviews of patients and community health workers. The fictional findings show modest gains in medication adherence and clinic attendance among patients with reliable connectivity, while patients without a personal device showed little change. Interview themes point to trust in the community health worker as the strongest predictor of continued participation. The study proposes a hybrid follow-up model that keeps a local contact person at the center of every telehealth plan.",
  },
  // ---- Technology --------------------------------------------------------
  {
    group: "core",
    title: "Design and Evaluation of a Mobile Queue Management App for a University Registrar Office",
    level: "undergraduate",
    category: "Technology",
    type: "Final",
    audience: "Student researcher",
    keywords: ["queue management", "mobile application", "registrar", "usability"],
    abstract:
      "This fictitious capstone project describes the design of a mobile application that lets students reserve a time slot and track their place in line at a university registrar office. The invented team followed an iterative prototyping process, gathering requirements from staff interviews and testing three prototypes with a small group of student volunteers. The imagined evaluation reports shorter perceived waiting time and higher satisfaction scores compared with the paper ticket system, with staff noting fewer disputes about turn order. System usability ratings fell in the good range. The paper concludes with limits of the prototype and suggestions for integrating the queue with the existing records system.",
  },
  {
    group: "core",
    title: "Anomaly Detection in Campus Network Traffic Using Unsupervised Learning",
    level: "masteral",
    category: "Technology",
    type: "Draft",
    audience: "Student researcher",
    keywords: ["anomaly detection", "network traffic", "unsupervised learning", "campus network"],
    abstract:
      "This invented draft explores whether unsupervised learning can flag unusual activity in the traffic logs of a university campus network without labeled attack data. Flow records from a simulated network were prepared and used to train isolation-based and clustering-based detectors, which were then compared on injected scanning and data-exfiltration patterns. The fictional results indicate that the isolation approach caught most injected events with a manageable false alarm rate, while clustering struggled with bursty but harmless traffic such as software updates. The draft discusses feature choices, the cost of tuning on a changing network, and plans for testing against replayed public benchmark captures in a later stage.",
  },
  // ---- Education ---------------------------------------------------------
  {
    group: "core",
    title: "Effects of Gamified Quizzes on Grade 8 Mathematics Engagement",
    level: "masteral",
    category: "Education",
    type: "Draft",
    audience: "Student researcher",
    keywords: ["gamification", "mathematics", "student engagement", "junior high school"],
    abstract:
      "This fictitious study investigates whether short gamified quizzes raise engagement among Grade 8 mathematics learners. The invented design is a quasi-experiment with two intact sections taught the same unit, one using point-and-badge quizzes and the other using ordinary seatwork. Engagement was imagined to be measured through a classroom observation checklist and a brief student questionnaire over six weeks. The made-up results show higher on-task behavior and more voluntary practice in the gamified section, while differences in unit test scores were small. Learners described the quizzes as motivating but noted that the leaderboard discouraged some classmates. The draft ends with cautions on novelty effects.",
  },
  {
    group: "core",
    title: "Teacher Workload and Instructional Quality in Public Elementary Schools",
    level: "masteral",
    category: "Education",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["teacher workload", "instructional quality", "elementary education", "public schools"],
    abstract:
      "This invented study asks how the volume of non-teaching tasks relates to the quality of classroom instruction in public elementary schools. A correlational survey of teachers was imagined, paired with lesson observations scored on a common rubric by trained raters. The fictional analysis finds that heavier administrative load is linked to lower ratings on lesson planning and feedback, even after accounting for class size and years of experience. Teachers who reported strong support from school heads showed weaker negative effects. The study recommends clearer limits on reporting duties, shared preparation time, and school-level routines that protect planning hours.",
  },
  // ---- Law ---------------------------------------------------------------
  {
    group: "core",
    title: "Awareness of Data Privacy Rights Among Online Sellers in Cebu City",
    level: "undergraduate",
    category: "Law",
    type: "Final",
    audience: "Student researcher",
    keywords: ["data privacy", "online sellers", "consumer data", "legal awareness"],
    abstract:
      "This fictitious thesis surveys small online sellers about how well they understand the data privacy obligations that apply to the customer information they collect. The invented respondents were drawn from social media storefronts and marketplace platforms and answered a questionnaire on consent, storage, and sharing of customer details. The imagined findings show that most sellers collect names, addresses, and phone numbers as a matter of routine but few have a written privacy notice or a plan for deleting old orders. Awareness was higher among sellers who had attended a seminar. The study recommends plain-language guides and short trainings from local business offices.",
  },
  {
    group: "core",
    title: "Enforcement Gaps in Local Ordinances on Solid Waste Segregation",
    level: "doctoral",
    category: "Law",
    type: "Draft",
    audience: "Faculty researcher",
    keywords: ["solid waste", "local ordinances", "enforcement", "environmental law"],
    abstract:
      "This invented dissertation draft analyzes why local ordinances requiring household waste segregation are unevenly enforced. Using a comparative case study of several fictional municipalities, it reviews ordinance text, penalty provisions, and collection schedules, and interviews barangay officials and collection crews. The imagined findings point to three recurring gaps: penalties that are rarely applied, collection routes that mix segregated waste back together, and limited monitoring capacity at the community level. The draft argues that clearer enforcement duties, funded monitoring, and consistent collection practice would do more for compliance than higher fines, and outlines the remaining chapters.",
  },
  // ---- Engineering -------------------------------------------------------
  {
    group: "core",
    title: "Low-Cost Rainwater Harvesting System for Small Residential Buildings",
    level: "undergraduate",
    category: "Engineering",
    type: "Final",
    audience: "Student researcher",
    keywords: ["rainwater harvesting", "low-cost design", "residential", "water supply"],
    abstract:
      "This fictitious capstone project presents the design and costing of a rainwater harvesting system sized for small residential buildings. The invented team estimated roof catchment, tank volume, and first-flush diversion from local rainfall records, then built a scaled prototype to test filtration and flow. The imagined results show that the proposed layout could cover a large share of non-drinking household water use during the wet months at a cost well below commercial packaged systems. Maintenance needs and mosquito control measures are discussed. The paper closes with recommendations for tank placement, material choices, and a simple inspection schedule for homeowners.",
  },
  {
    group: "core",
    title: "Structural Performance of Coconut Fiber Reinforced Concrete Hollow Blocks",
    level: "masteral",
    category: "Engineering",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["coconut fiber", "hollow blocks", "compressive strength", "sustainable materials"],
    abstract:
      "This invented study tests whether adding treated coconut fiber to concrete hollow blocks changes their structural performance. Block batches with different fiber proportions were imagined to be cast, cured, and tested for compressive strength, water absorption, and weight. The fictional results show that a small fiber proportion slightly improved crack resistance and lowered block weight, while higher proportions reduced compressive strength below the usual requirement for load-bearing use. The study discusses fiber treatment, mixing difficulties, and cost. It concludes that the blocks may suit non-load-bearing partitions and recommends larger test batches before any field use.",
  },
  // ---- Blockchain --------------------------------------------------------
  {
    group: "core",
    title: "A Blockchain-Based Attendance Verification System for Student Organizations",
    level: "undergraduate",
    category: "Blockchain",
    type: "Draft",
    audience: "Student researcher",
    keywords: ["blockchain", "attendance", "student organizations", "verification"],
    abstract:
      "This fictitious capstone draft proposes a system that records event attendance for student organizations as tamper-evident entries on a test blockchain network. Attendees would scan a rotating code at the venue, and the invented system would store only a hashed receipt so that no personal details appear on the ledger. The imagined prototype was tried at two campus events and compared with paper sign-in sheets for accuracy and time at the door. The draft reports faster check-in and fewer disputes over missing records, and lists open issues such as lost phones and gas fees. Later chapters will cover privacy review and an officer feedback survey.",
  },
  {
    group: "core",
    title: "Consensus Overhead in Permissioned Ledgers for Academic Credential Sharing",
    level: "doctoral",
    category: "Blockchain",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["permissioned ledger", "consensus", "academic credentials", "performance"],
    abstract:
      "This invented dissertation compares the overhead of consensus protocols in permissioned ledgers designed for sharing academic credentials among universities. A simulated consortium of institutions was imagined, with workloads modeled on enrollment periods and graduation season. Three protocol families were evaluated for latency, throughput, and message cost as the number of participating institutions grew. The fictional results show that lighter crash-tolerant protocols scale comfortably for small consortia, while Byzantine-tolerant designs impose rising costs that matter only when participants do not trust one another. The work offers a decision guide for choosing a protocol by consortium size and trust assumptions, and notes the limits of simulation.",
  },
  // ---- Business ----------------------------------------------------------
  {
    group: "core",
    title: "Customer Loyalty Drivers of Neighborhood Coffee Shops",
    level: "undergraduate",
    category: "Business",
    type: "Draft",
    audience: "Student researcher",
    keywords: ["customer loyalty", "coffee shops", "service quality", "small business"],
    abstract:
      "This fictitious thesis draft examines what keeps customers coming back to independent neighborhood coffee shops. An invented questionnaire covering product quality, price fairness, ambiance, staff friendliness, and loyalty program use was imagined to be answered by regular customers of several shops. The made-up analysis suggests that staff friendliness and consistent drink quality outrank price in predicting repeat visits, while loyalty cards had a small effect that faded for customers who already visited weekly. The draft outlines how the findings could guide small owners in training staff and designing simple rewards, and lists the remaining analyses planned for the final version.",
  },
  {
    group: "core",
    title: "Cash Flow Management Practices of Micro Enterprises After Digital Payment Adoption",
    level: "masteral",
    category: "Business",
    type: "Draft",
    audience: "Faculty researcher",
    keywords: ["cash flow", "micro enterprises", "digital payments", "financial management"],
    abstract:
      "This invented draft studies how very small businesses changed their cash flow management after accepting digital payments. Owners of market stalls, food vendors, and service shops were imagined to be interviewed and their record-keeping habits compared before and after adoption. The fictional findings show clearer sales records and fewer cash handling errors, but also delays between a sale and funds becoming usable, which strained purchases of daily stock. Owners with a separate account for business funds coped better. The draft discusses fees, trust in the payment platform, and a proposed checklist for owners, and sets out the interview analysis still to be completed.",
  },
  // ---- Science -----------------------------------------------------------
  {
    group: "core",
    title: "Antibacterial Activity of Guava Leaf Extract Against Common Skin Bacteria",
    level: "masteral",
    category: "Science",
    type: "Final",
    audience: "Student researcher",
    keywords: ["guava leaf", "plant extract", "antibacterial", "skin bacteria"],
    abstract:
      "This fictitious study screens an ethanol extract of guava leaves for antibacterial activity against bacteria commonly found on human skin. The invented laboratory work compared several extract concentrations with a standard antibiotic disc and a solvent control using the disc diffusion method. The imagined results show clear inhibition zones for most test organisms at the higher concentrations, smaller zones at lower ones, and no activity in the solvent control. Phytochemical screening indicated the presence of tannins and flavonoids. The paper cautions that laboratory inhibition does not establish safety or effectiveness on skin and recommends toxicity testing before any product development.",
  },
  {
    group: "core",
    title: "Microplastic Concentration in Selected Visayan Coastal Sediments",
    level: "doctoral",
    category: "Science",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["microplastics", "coastal sediment", "marine pollution", "environmental monitoring"],
    abstract:
      "This invented dissertation estimates microplastic concentrations in sediments collected from several fictional coastal sites with differing land use. Sediment samples were imagined to be separated by density, filtered, and examined for particle shape, color, and polymer type. The made-up results show higher concentrations near river mouths and fishing landings than at sites far from settlements, with fibers and fragments dominating. Polymer analysis pointed to common packaging and fishing gear materials. The work compares its findings with an invented regional baseline and recommends regular monitoring, better waste capture at river outlets, and standard sampling methods so that sites can be compared over time.",
  },
  // ---- Arts --------------------------------------------------------------
  {
    group: "core",
    title: "Visual Storytelling in Contemporary Cebuano Zine Culture",
    level: "undergraduate",
    category: "Arts",
    type: "Draft",
    audience: "Student researcher",
    keywords: ["zines", "visual storytelling", "Cebuano", "independent publishing"],
    abstract:
      "This fictitious thesis draft looks at how young creators use images, layout, and local language to tell stories in self-published zines. An invented collection of zines was imagined to be analyzed for recurring visual devices, such as hand-drawn lettering, collage, and panel breaks, and for themes of city life, family, and migration. Informal interviews with the makers were imagined to explain why they chose print over social media. The draft proposes that the zines work as small archives of everyday experience and that their low-cost format invites participation. It ends with a plan to document the collection and seek the makers' consent before any exhibit.",
  },
  {
    group: "core",
    title: "Adaptive Reuse of Heritage Spaces as Community Art Venues",
    level: "masteral",
    category: "Arts",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["adaptive reuse", "heritage", "community art", "cultural spaces"],
    abstract:
      "This invented study examines how old buildings are converted into community art venues and what happens to their heritage value in the process. Using multiple case studies of imagined renovated spaces, the research reviews design drawings, visitor counts, and interviews with curators, owners, and neighbors. The fictional findings indicate that venues that kept original features and invited residents into programming were seen as more authentic and drew steadier attendance, while heavily remodeled spaces felt detached from local memory. The study offers design and governance principles for balancing preservation, safety upgrades, and flexible exhibition use, and points to funding as the most persistent constraint.",
  },
  // ---- Social Sciences ---------------------------------------------------
  {
    group: "core",
    title: "Remittance Dependence and Household Decision-Making in Island Communities",
    level: "doctoral",
    category: "Social Sciences",
    type: "Draft",
    audience: "Faculty researcher",
    keywords: ["remittances", "household decision-making", "island communities", "migration"],
    abstract:
      "This invented dissertation draft explores how reliance on money sent home by overseas relatives shapes decision-making inside households in island communities. A qualitative design was imagined, using household interviews, group discussions, and a review of local spending patterns. The fictional themes suggest that remittances expand spending on education and housing but also concentrate decisions in the hands of the absent earner, with spouses and elders negotiating how funds are used through frequent calls. The draft frames these patterns through household bargaining and care-chain concepts and sets out the chapters on livelihood diversification and community support that remain to be written.",
  },
  {
    group: "core",
    title: "Youth Political Participation in the Age of Short-Form Video",
    level: "doctoral",
    category: "Social Sciences",
    type: "Final",
    audience: "Faculty researcher",
    keywords: ["political participation", "youth", "short-form video", "civic engagement"],
    abstract:
      "This invented dissertation investigates how young adults use short-form video platforms to learn about public issues and decide whether to take part in civic activity. A sequential mixed-methods design was imagined, combining a survey of university students with interviews and a review of widely shared clips. The fictional results show that viewing is common but that sharing and discussion matter more than viewing for offline participation such as volunteering or attending forums. Participants described difficulty judging the accuracy of clips and relied on friends to filter content. The work recommends media literacy activities that begin from the platforms students already use.",
  },
];

/**
 * Near-duplicates. Each imitates a core title closely enough to exercise the
 * similarity system (pg_trgm on the normalized title; alert at 0.50, auto-flag
 * at 0.75). Submit each from a DIFFERENT researcher than the original owner:
 * same-owner matches are skipped on purpose.
 */
export const NEAR_DUPLICATES: DummyThesis[] = [
  {
    group: "near-duplicate",
    title: "Design and Evaluation of a Mobile Queue Management Application for a University Registrar Office",
    level: "undergraduate",
    category: "Technology",
    type: "Final",
    audience: "Student researcher",
    keywords: ["queue management", "mobile application", "registrar", "waiting time"],
    imitates: "Design and Evaluation of a Mobile Queue Management App for a University Registrar Office",
    expect: "auto-flag",
    abstract:
      "This fictitious capstone project reports a second, invented attempt at building a phone application that helps students book a slot and follow the line at a registrar office. The imagined team surveyed students about the longest waits in the enrollment period and built a prototype with text notifications when a turn was near. A small trial with volunteer students and two staff members is described, with imagined feedback on notification timing and on how to handle walk-in students. The paper reports positive reactions and a lower number of complaints at the counter, and lists planned improvements to the notification rules and the staff screen.",
  },
  {
    group: "near-duplicate",
    title: "Low-Cost Rainwater Harvesting System for Small Residential Houses",
    level: "undergraduate",
    category: "Engineering",
    type: "Final",
    audience: "Student researcher",
    keywords: ["rainwater", "household water", "tank design", "low cost"],
    imitates: "Low-Cost Rainwater Harvesting System for Small Residential Buildings",
    expect: "auto-flag",
    abstract:
      "This fictitious capstone project describes an invented rainwater collection setup for small houses, covering gutter layout, storage tank sizing, and simple filtration. The imagined group computed expected collection from monthly rainfall averages and built a small test rig to observe flow rates and clogging. The made-up findings suggest that a modest tank can supply laundry and cleaning water through most of the rainy season, and that a screened first-flush chamber keeps debris out of the tank. Costs are compared with buying a ready-made unit. The paper also describes upkeep tasks such as cleaning screens and checking seals before and after the wet season.",
  },
  {
    group: "near-duplicate",
    title: "Customer Loyalty Drivers of Neighbourhood Coffee Shops",
    level: "undergraduate",
    category: "Business",
    type: "Final",
    audience: "Student researcher",
    keywords: ["loyalty", "coffee shops", "repeat visits", "customer satisfaction"],
    imitates: "Customer Loyalty Drivers of Neighborhood Coffee Shops",
    expect: "auto-flag",
    abstract:
      "This fictitious thesis asks why customers return to small independent coffee shops instead of larger chains. An invented survey of regular patrons covered drink consistency, price, seating comfort, friendliness of staff, and use of stamp cards. The imagined results suggest that being recognized by staff and getting the same quality each visit mattered most, while discounts played a smaller part. Younger customers valued quiet seating and charging outlets more than older customers did. The study offers practical suggestions for owners, such as remembering regular orders and keeping a short but dependable menu, and lists the limits of a small convenience sample.",
  },
  {
    group: "near-duplicate",
    title: "Awareness of Data Privacy Rights Among Online Sellers in Metro Cebu",
    level: "undergraduate",
    category: "Law",
    type: "Final",
    audience: "Student researcher",
    keywords: ["data privacy", "online sellers", "compliance", "awareness"],
    imitates: "Awareness of Data Privacy Rights Among Online Sellers in Cebu City",
    expect: "auto-flag",
    abstract:
      "This fictitious thesis measures how well small online sellers in an imagined metropolitan area understand their duties when handling customer information. An invented questionnaire asked about consent to collect details, how long records are kept, and what to do after a customer complaint or a leaked chat. The made-up findings show that sellers are familiar with the idea of privacy but unsure of specific duties, and that very few keep a notice for customers. Sellers who belonged to online seller groups had learned more from peers than from official guidance. The study suggests short templates and community briefings as ways to close the awareness gap.",
  },
  {
    // Alert-only: shares the subject but is reworded enough to stay under 0.75.
    group: "near-duplicate",
    title: "Hand Hygiene Compliance Among Medical Technology Students During Laboratory Rotations",
    level: "undergraduate",
    category: "Medical",
    type: "Final",
    audience: "Student researcher",
    keywords: ["hand hygiene", "medical technology", "laboratory safety", "infection control"],
    imitates: "Hand Hygiene Compliance Among Nursing Students During Clinical Rotations",
    expect: "alert-only",
    note: "Should raise a title alert but NOT an auto-flag dispute.",
    abstract:
      "This fictitious thesis describes the hand hygiene habits of medical technology students while they train in hospital laboratories. The invented study combined direct observation during specimen handling with a short questionnaire on training received and perceived risk. The imagined results show good practice after handling blood samples but lapses when moving between workstations and when answering the telephone with gloves on. Students who had practiced the steps in a skills session before placement reported higher confidence. The paper proposes laboratory-specific reminders, a visible glove-use policy, and a short refresher at the start of every rotation block to keep habits steady.",
  },
];

/** Clean, distinct papers that simply populate the registry for demos. */
export const EXTRAS: DummyThesis[] = [
  {
    group: "extra",
    title: "Prevalence of Screen-Related Eye Strain Among Call Center Employees",
    level: "undergraduate",
    category: "Medical",
    type: "Final",
    audience: "Demo seed",
    keywords: ["eye strain", "screen time", "call center", "occupational health"],
    abstract:
      "This fictitious thesis estimates how common screen-related eye strain is among call center employees and which working conditions are linked to it. An invented survey of agents on day and night shifts asked about dryness, headaches, blurred vision, break habits, and screen setup. The imagined results show that symptoms were common, most frequent among agents who skipped short breaks or worked with unadjusted screens, and slightly more reported on night shifts. The study suggests scheduled micro-breaks, adjustable monitors, and lighting checks, and notes that self-reported symptoms are not a clinical diagnosis.",
  },
  {
    group: "extra",
    title: "A Web-Based Inventory System for Small Pharmacies",
    level: "undergraduate",
    category: "Technology",
    type: "Final",
    audience: "Demo seed",
    keywords: ["inventory system", "pharmacy", "web application", "stock monitoring"],
    abstract:
      "This fictitious capstone project presents a web-based inventory system built for small independent pharmacies that still track stock in notebooks. The invented system records deliveries and sales, warns about items near their expiry date, and produces simple reorder lists. A prototype was imagined to be tested by two pharmacy staff members over a month, who compared its records with a manual count. The made-up results show fewer stock discrepancies and faster end-of-day counting. The paper describes the database design, user roles, and limits of the prototype, such as lack of barcode scanning, and lists features for a later version.",
  },
  {
    group: "extra",
    title: "Parental Involvement and Reading Proficiency in Early Grades",
    level: "masteral",
    category: "Education",
    type: "Final",
    audience: "Demo seed",
    keywords: ["parental involvement", "reading proficiency", "early grades", "literacy"],
    abstract:
      "This invented study explores how different forms of parental involvement relate to reading proficiency among learners in the early grades. A correlational design was imagined, combining a parent questionnaire with the results of a standard classroom reading assessment. The fictional findings show that regular reading together at home and talking about school mattered more than attendance at school events, and that the pattern held across income groups. Teachers described low-cost ways to encourage involvement, such as take-home story packets. The study recommends school programs that coach parents in simple reading routines rather than relying on meetings alone.",
  },
  {
    group: "extra",
    title: "Legal Remedies for Consumers in Online Marketplace Disputes",
    level: "undergraduate",
    category: "Law",
    type: "Final",
    audience: "Demo seed",
    keywords: ["consumer protection", "online marketplace", "dispute resolution", "remedies"],
    abstract:
      "This fictitious thesis reviews the legal remedies available to consumers who have a dispute with a seller on an online marketplace. Through a doctrinal review of consumer protection rules and a set of invented sample complaints, the study maps the routes a buyer may take, from platform dispute tools to mediation and formal complaints. The imagined analysis finds that remedies exist on paper but are hard to use because of unclear seller identity, short complaint windows, and uncertain responsibility between sellers and platforms. The thesis recommends clearer disclosure rules and a simple, low-cost complaint path for small-value purchases.",
  },
  {
    group: "extra",
    title: "Solar-Powered Irrigation Pump Design for Small Vegetable Farms",
    level: "masteral",
    category: "Engineering",
    type: "Final",
    audience: "Demo seed",
    keywords: ["solar pump", "irrigation", "small farms", "renewable energy"],
    abstract:
      "This invented study designs and evaluates a solar-powered irrigation pump for small vegetable farms that rely on diesel or hand watering. Panel size, pump head, and storage tank volume were imagined to be sized from sunshine data and crop water needs, and a field prototype was built to observe daily output. The fictional results show that the system could meet the daily watering needs of a small plot on most sunny days, with a tank bridging short cloudy periods. The study compares lifetime costs with a diesel pump and discusses theft protection, maintenance, and options for financing equipment through farmer groups.",
  },
  {
    group: "extra",
    title: "Smart Contract Vulnerability Patterns in Student-Built Token Projects",
    level: "masteral",
    category: "Blockchain",
    type: "Final",
    audience: "Demo seed",
    keywords: ["smart contracts", "vulnerabilities", "token projects", "code review"],
    abstract:
      "This fictitious study catalogs common vulnerability patterns in token contracts written by students as course projects. An invented set of contracts was imagined to be reviewed with static analysis tools and a manual checklist, and each issue was classified by type and severity. The made-up results show that missing access control, unchecked external calls, and arithmetic mistakes account for most findings, while many projects lacked any automated tests. The study proposes a short pre-deployment checklist and a template test suite that instructors could hand out, and discusses how automated tools and manual review catch different kinds of problems.",
  },
  {
    group: "extra",
    title: "Social Media Marketing Practices of Home-Based Food Sellers",
    level: "undergraduate",
    category: "Business",
    type: "Final",
    audience: "Demo seed",
    keywords: ["social media marketing", "home-based business", "food sellers", "customer reach"],
    abstract:
      "This fictitious thesis describes how home-based food sellers use social media to find and keep customers. An invented survey and a set of seller interviews covered posting habits, photo quality, use of paid promotion, response time to messages, and handling of pre-orders. The imagined findings indicate that regular posting and quick replies were linked to steadier orders, while paid promotion helped only sellers who already had clear menus and delivery arrangements. Many sellers struggled with pricing and with tracking orders in chat threads. The study offers a simple posting and order-tracking routine that new sellers could follow.",
  },
  {
    group: "extra",
    title: "Seasonal Variation of Water Quality in a Small Upland Stream",
    level: "doctoral",
    category: "Science",
    type: "Final",
    audience: "Demo seed",
    keywords: ["water quality", "seasonal variation", "upland stream", "monitoring"],
    abstract:
      "This invented dissertation tracks how the water quality of a small upland stream changes between the dry and wet seasons. Samples were imagined to be collected monthly at several points along the stream and measured for temperature, dissolved oxygen, turbidity, acidity, and nutrient levels, alongside notes on nearby land use. The fictional results show higher turbidity and nutrient levels after heavy rain, and lower dissolved oxygen at warm, low-flow points downstream of farms. The study argues for protecting stream banks and for a low-cost community monitoring routine, and discusses the limits of monthly sampling for catching short pollution events.",
  },
  {
    group: "extra",
    title: "Color Symbolism in Festival Costume Design",
    level: "undergraduate",
    category: "Arts",
    type: "Final",
    audience: "Demo seed",
    keywords: ["color symbolism", "festival costumes", "design", "cultural meaning"],
    abstract:
      "This fictitious thesis examines the meanings attached to color in the costumes worn at community festivals and how designers choose their palettes. An invented set of costumes was imagined to be photographed and coded for dominant colors, and costume makers were interviewed about tradition, availability of dyes and fabrics, and audience expectations. The made-up findings suggest that colors carry shared meanings tied to the festival story, but that cost and the look of stage lighting increasingly change real choices. The study recommends documenting makers' knowledge in a visual guide that can serve students of costume design.",
  },
  {
    group: "extra",
    title: "Coping Strategies of Working Students During Examination Periods",
    level: "masteral",
    category: "Social Sciences",
    type: "Final",
    audience: "Demo seed",
    keywords: ["coping strategies", "working students", "examination stress", "time management"],
    abstract:
      "This invented study explores how students who hold jobs cope with the pressure of examination weeks. A concurrent mixed-methods design was imagined, with a coping inventory answered by working students and follow-up interviews with a smaller group. The fictional results show that planning and asking supervisors for flexible shifts were the most common helpful strategies, while skipping sleep and avoiding tasks were linked to higher reported stress. Students described feeling unseen by both employers and instructors. The study recommends clearer exam schedules, flexible deadlines for working students, and campus counseling hours that fit their time.",
  },
];
