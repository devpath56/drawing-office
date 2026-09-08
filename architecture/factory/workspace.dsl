/*
 * THE FACTORY AS THREE DEPARTMENTS, drawn from three models rather than from memory.
 *
 * Production is design-loop's main pipe (core/pipe.json, 12 stages, 1 guard, 11 stores). HR is
 * advisor-builder (pipe.json, 57 nodes, 16 guards). L&D is learn-verify-kit (spec/SPEC-LVK-v2.md,
 * 3 BUILT · 2 PARTIAL · 9 UNBUILT). The nine seams between them were read from the code that carries
 * each one on 2026-09-07 (core/docs/CONCEPT-three-departments.md §0b); a seam that does not exist
 * yet is drawn with its description starting ABSENT, so the picture cannot claim it.
 *
 * One rule from the concept note: each department is a deep module. Production never sees a
 * competency, HR never sees a quiz score, L&D never sees a candidate row. The lines between systems
 * are the whole interface.
 */
workspace "The Factory" "Production, HR and L&D as three deep modules with nine seams, modelled 2026-09-07." {

    /* THE LENS ORDER IS THE MODEL'S. The viewer composes every perspective a box carries into one
       hover, in this order, and arms no layer of its own: a layer dims what does not carry it, and
       a hover is not a comparison. A perspective a box carries that is not named here still shows,
       after these. */
    properties {
        "drawing-office.lenses" "Insight, OSS equivalent"
    }

    model {
        operator = person "Operator" "Types asks, rules on candidates, learns, declares weights, rates advisors."

        todoist = softwareSystem "Todoist" "Two boards: Telegram ingest, Granola next steps." "Existing System"
        telegram = softwareSystem "Telegram" "Links a routine turns into cards." "Existing System"
        granola = softwareSystem "Granola" "Meetings that become cards." "Existing System"
        web = softwareSystem "The web" "Where OSS candidates are searched, with a quoted query." "Existing System"
        sourceLibrary = softwareSystem "Source library" "Gitignored books; local grounding only." "Existing System"
        agent = softwareSystem "Agent in session" "Does the LLM work; no API key in any tree." "Existing System"

        production = softwareSystem "Production: the main pipe" "An utterance becomes a frozen requirement, or a recorded refusal, with a door at every hop." {
            /* PERSPECTIVE "OSS equivalent": one layer across every container, on hover. Each entry is
               VERDICT · why, product excellence first and incumbency last · basis. A basis of OSS-nnn
               means the door ruled it; FROM-MEMORY means it has not been through the door and is a
               candidate list, not a ruling. */
            askStore = container "Ask store" "One ask, separately closable; the front door every message enters." "SQLite, core/store/factory.db" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: an issue-tracker inbox (Linear, Jira) or a queue topic. Neither keeps the utterance verbatim at the grain of one closable ask, which is the product; SQLite on the one store is right at this volume. Basis: FROM-MEMORY."
                    "Insight" "Not on the PR-057 path; its own query exits 1 today: the store is lagging its source (PR-056)\n· an honest red is a read that ran; the lens counts it as answered, not broken\n· every ask of this session entered here through the hooks, none typed by hand"
                }
            }
            driver = container "Pipe driver" "A durable state machine over the pipe model: one run row per piece of work, every hop's verdict on the row." "Node, core/pipe/run.mjs" {
                perspectives {
                    "OSS equivalent" "KEEP, revisit at fan-out. Temporal, Restate, DBOS, XState v5 were scored; the in-tree run table led on dag-from-data, no server, node doors and human waits, and lost only durable resume, which was then built. Temporal wins when runs fan out and someone wants to watch. Basis: ADR 0018, ADAPT."
                    "Insight" "Not on the PR-057 path: a falsifier attack is not a pipe run\n· two runs exist: RUN-001 done at registry-admission, RUN-002 refused at jobs-gate on a probe that read UNEVALUABLE\n· RUN-003 (the workflow-architect advisor) opens at plan step W3 with PR-049 alive at its gate"
                }
            }
            gates = container "Admission doors" "jobs-gate, candidate-admission, job-admission, spec-freeze, registry-admission: each refuses a named thing." "Node, core/spec" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: Danger.js rules on a PR, Backstage scaffolder gates. Neither carries admission-by-refusal with a closed vocabulary and a pre-registered probe as the price of entry; that vocabulary is the product. Basis: FROM-MEMORY."
                    "Insight" "Not on the PR-057 path, but its consumer: jobs-gate admits only a candidate whose probe last read HELD\n· six named refusals: no probe row, NO-TEETH, k under 1, no baseline, verdict not HELD, no surface\n· RUN-002 fell on the fifth; PR-057's HELD is what a future candidate needs at this door"
                }
            }
            falsifier = container "RAT falsifier" "Runs each candidate's pre-registered kill criterion, risk-ordered; HELD, FALSIFIED, UNEVALUABLE, NO-TEETH." "Node, prongs/falsifier.mjs" {
                perspectives {
                    "OSS equivalent" "KEEP the ledger semantics, ADAPT the runner later. Inspect AI (solvers, scorers, sandboxes) and promptfoo assertions run criteria at scale; neither pre-registers a kill criterion, pins its command sha, or distinguishes could-not-look from failed. Run criteria under Inspect when sandboxing matters. Basis: OSS-036 for Inspect; the rest FROM-MEMORY."
                    "Insight" "Last run: PR-057 at k=3, one probe attacked, 55 left untouched\n· --only narrowed membership and said so on the line; 392 ms, not 128 s\n· verdict FLIP UNEVALUABLE to HELD, recorded as an attack, never an edit\n· lineage: command sha b07cff4e, criterion sha 93b7d931 pinned on the row"
                }
            }
            probes = container "Probe ledger" "Pre-registered claims, their criteria, baselines and attacks." "JSONL, failures/probes.jsonl" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: MLflow or Weights and Biases runs, OSF pre-registration. None joins a claim, a runnable criterion, a baseline and every later attack in one row with lineage. JSONL is fine at tens of rows; SQLite when it is hundreds. Basis: FROM-MEMORY."
                    "Insight" "56 rows, 712 loops, deepest row k=24; 15 rows registered today through the doorway\n· PR-057 carries baseline, two attacks, command sha and criterion sha: a verdict anyone can re-derive\n· mirrored to the one store on every write, so git and the db never disagree on a row"
                }
            }
            reviewStore = container "Jobs review store" "Candidates awaiting the operator's ruling." "JSONL, core/research-DP" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP the row contract, ADAPT the surface. A GitHub review queue or a Todoist board shows candidates better than a JSONL file; Todoist is already an external here. The contract row 0 enforces, subject-verb-object and FR/NFR, is the part no board has. Basis: FROM-MEMORY."
                    "Insight" "Not on the PR-057 path; the guard in front of it is: a candidate whose probe is dead never becomes a row here\n· measured 2026-09-03: 81 rows in review, 57 never ruled; the bottleneck is a person's decision\n· dated reading, not live; the store's own query answers today's count"
                }
            }
            specStore = container "Spec store" "EARS requirements with verify and fails_when; the view is generated." "JSONL, core/spec/requirements.jsonl" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP and BUILD one piece. Doorstop, StrictDoc, OpenFastTrace, Sphinx-Needs were scored; this store led six of seven axes and lost traceability by one point to tools that fail zero-install. Build the verify runner that refuses BUILT on a red exit; nobody carries it above 2 of 4. Basis: OSS-035, UNRULED by the machine, ADAPT recommended."
                    "Insight" "Not on the PR-057 path; PR-042 sits on it: 29 of 29 HR rows refused by this store's validator today\n· by field: scope 29, layer 29, module 27; the port's bill, measured before a row moves\n· EARS as schema, RETIRED as a status, module must be a tracked path: the three things HR lacks"
                }
            }
            registry = container "Machinery registry" "Every machine the factory counts, with its stage." "JSON, core/registry" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP now, REPLACE at more than one team. Backstage's software catalog is the same idea with a UI and ownership; it costs a service and a schema you do not need for one operator. OpenFastTrace tags in code are the traceability half. Basis: FROM-MEMORY."
                    "Insight" "Not on the PR-057 path; it is where the doorway and the criteria must be admitted next\n· 120 machines scoped, six layers each, the query cell executed: a declaration beside a dead query is prose\n· the corpora family (plan step 0) joins here, and PR-045 flips the day it does"
                }
            }
            ossDoors = container "Procurement doors" "oss-search refuses a search with no receipt; oss-select refuses a composite score." "Node, prongs/oss-search.mjs, prongs/oss-select.mjs" {
                perspectives {
                    "OSS equivalent" "KEEP. adrkit and MADR are already adopted for the record; no OSS tool enforces a prior-art receipt or a Pareto ruling without totals before code is written, searched 2026-09-02. The six refusals are the product. Basis: ADR 0001, the crit-bench receipts."
                    "Insight" "Not on the PR-057 path; six records written today through it, OSS-035 to OSS-040, five UNRULED\n· a plus sign in a candidate's name made it a bundle suspect and dropped it from the ruling until renamed\n· the ADR pages now carry an assertion per probe, so the engine judged its first real decision today"
                }
            }
            verifier = container "Model verifier and renderer" "verify() and render() over any pipe model, by root; the one home for both departments' pictures." "Node, core/doc/pipe-views.mjs" {
                perspectives {
                    "OSS equivalent" "ADAPT, done today. Structurizr DSL, LikeC4 and this in-tree verifier were scored and tied; the ruling now is both: keep verify() as the model's gate, render through Structurizr in the drawing office, which is this picture. Basis: ADR 0011, UNRULED, resolved by use."
                    "Insight" "Not on the PR-057 path; it drew this picture: HR's model verified at 0 problems after three refusals\n· the refusals were real: an edge restating a blurb, two captions telling two stories\n· one verifier for two departments' models, reached by root; no second copy"
                }
            }
            /* THE FOUR MACHINES A RAT ATTACK TOUCHES THAT THE MODEL DID NOT NAME, added 2026-09-07 to
               trace PR-057 end to end. Each was read from the code it names; none is new work. */
            probeDoorway = container "Probe doorway" "Registers one probe: scaffolds the criterion and its control, builds the row from the contract, hands it to the ledger door, prints the contract on refusal." "Node, prongs/probe-new.mjs" {
                perspectives {
                    "OSS equivalent" "KEEP. Built today (ousterhout-guru: fix the doorway, not the loop); no OSS registers a pre-registered kill criterion. Basis: measured, one probe cost 15k tokens before it and 2k after."
                    "Insight" "PR-057 entered here: spec of four fields, row of twenty built from the contract\n· two refusals learned by refusal are now printed: tracked criterion, contract table\n· cost per probe fell from ~15k tokens to ~2k, measured on thirteen registrations today"
                }
            }
            ledgerDoor = container "Ledger door" "The one writer of the probe and decision ledgers; runs each ledger's validator before a row lands; a dry-run returns the verdict and writes nothing." "Node, prongs/record.mjs, checks/validate-probe.mjs" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: a schema-validated append-only log (Kafka with a schema registry) at a scale this factory does not have. Basis: FROM-MEMORY."
                    "Insight" "Two doors in one run: add probe (validated, mirrored) and add pd in dry-run (the criterion's own test)\n· the pd validator closes system to harness or product; that refusal was PR-057's first FALSIFIED\n· its dry-run word is written plus DRY RUN, not DRY_RUN; that mismatch was the second false alarm"
                }
            }
            riskRanker = container "Risk ranker" "Orders probes by exposure from the risk matrix: weight times level times component over ten; a probe with no mode runs after the ranked ones, never scored zero." "Node, core/risk/probe-rank.mjs, risk-matrix.json" {
                perspectives {
                    "OSS equivalent" "KEEP. Khosla's matrix arithmetic, the same as advisor-builder's risk_matrix.py; no OSS ranks test cases by declared exposure. Basis: FROM-MEMORY."
                    "Insight" "11 of 56 probes carry a mode and are ranked; 45 run after in ledger order\n· PR-057 carries reuse_missed at 420; with --only the order decided nothing this pass\n· ranking decides order, never membership: --only is the one narrowing, and it prints itself"
                }
            }
            criteria = container "Criteria" "One file per kill criterion: a pure judge() the control can drive to every verdict, and a CLI that exits 0 HELD, 1 FALSIFIED, 3 UNEVALUABLE." "Node, checks/crit/*.mjs" {
                perspectives {
                    "OSS equivalent" "ADAPT later under Inspect AI for sandboxed runs; the three-exit contract and the pure judge stay. Basis: OSS-036."
                    "Insight" "approve-row-shape.mjs: builds the approve row, asks the pd door in dry-run, maps the answer\n· 15 criteria written today, one shared control at 51 of 51; every one reaches all three verdicts on fixtures\n· its two defects were caught by the loop, not by the control: a closed enum and a door's own word"
                }
            }
            decisionsLedger = container "Decisions ledger" "Product decisions: what was chosen, the rejected alternative, the reversal cost, the guard artefacts that exist if and only if it was built." "JSONL, failures/decisions.jsonl" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP; MADR and adrkit already adopted for the OSS records beside it. Basis: ADR 0001."
                    "Insight" "24 rows; PR-057 asked it to accept a 25th in dry-run and it did\n· the approve act of the review surface will live here, as decided on OSS-039 and OSS-040\n· system must be harness or product: an approve of a factory checkpoint binds the harness"
                }
            }
        }

        hr = softwareSystem "HR: advisor-builder" "Turns a role and a corpus into a deployed advisor, and records what the operator thought of its answers." {
            lifecycle = container "Lifecycle lane" "Birth, deployment, retirement: advisor_new, deploy_advisor, advisor_lifecycle. Operator-invoked." "Python, engine" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: cookiecutter or Backstage templates for birth, a skills or MCP package for deployment. The value is the newborn gate, every gate RED on an empty cartridge, which no template tool enforces. Small enough that replacing it costs more than it is. Basis: FROM-MEMORY."
                }
            }
            riskMatrix = container "Khosla risk matrix and recruiter" "Ranks what to build by risk removed per token; joins owners to the installed roster and refuses fiction." "Python, engine/risk_matrix.py, engine/recruiter.py" {
                perspectives {
                    "OSS equivalent" "KEEP. No OSS implements Khosla's risk matrix with M1 to M6 refusals and a recruiter that refuses a fictional owner; the nearest genre is portfolio-prioritisation spreadsheets. Its honest limit is that levels are declared, never measured, and it says so on every line. Basis: FROM-MEMORY, searched for none."
                }
            }
            buildLane = container "Build lane P0 to P9" "Plan, competency map, sources, ingestion, graph, index, skill, measurement, outcome." "Python, engine" {
                perspectives {
                    "OSS equivalent" "ADAPT two stages, KEEP the rest. Graph construction (P4) has a mature OSS shape in Microsoft GraphRAG and LlamaIndex ingestion; skill optimisation (P6 to P7) in DSPy. Keep P0 to P2 and P8 to P9: risk-first planning, source authority and behaviour measurement are the product and exist nowhere else. Basis: FROM-MEMORY."
                }
            }
            hrGuards = container "Sixteen guards" "Fire on a candidate cartridge; nothing flows through them: triplet, graph, slop, routing, behaviour, red-proof, provenance, authorship, the ship gate." "Python, engine" {
                perspectives {
                    "OSS equivalent" "KEEP the semantics, ADAPT the runner. promptfoo assertions, Guardrails AI and deepeval run deterministic checks in CI well; none carries refuses-on vocabulary, RED-on-newborn, or a different-model judge as a rule. Run the deterministic guards under promptfoo for CI, keep the verdict words here. Basis: OSS-036 for promptfoo; the rest FROM-MEMORY."
                }
            }
            cartridges = container "Cartridges" "One advisor each: manifest, skill, corpus, graph; the graded case triplets live in its JTBD spec." "Directory, cartridges/" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP the directory, the format is already the OSS one. A cartridge deploys as a Claude skill; Hugging Face Hub is the nearest artefact store and adds nothing for a private roster of eleven. The graded triplet is the unit no format carries. Basis: FROM-MEMORY."
                }
            }
            feedback = container "Feedback and proficiency" "The operator's verdict on one answer, who said it, per job; graded 101 and 201 on the L&D vocabulary." "Python, engine/feedback.py, engine/proficiency.py" {
                perspectives {
                    "OSS equivalent" "ADAPT the surface at volume, KEEP the fields. Langfuse and Arize Phoenix annotation queues and Argilla give a labelling UI; none records who said it, which job it calibrates, or the repair on file (AB-13, 15, 17). The ledger is empty today, so the surface is not the bottleneck yet. Basis: OSS-036 for Langfuse; the rest FROM-MEMORY."
                }
            }
            feedbackLedger = container "Feedback ledger" "One verdict on one answer. Empty until an advisor is used." "JSONL, failures/advisor-feedback.jsonl" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP. Zero bytes today; the OSS question is premature. When it holds hundreds of rows, the same answer as the feedback surface: an annotation store with these fields added. Basis: measured empty 2026-09-07."
                }
            }
        }

        ld = softwareSystem "L&D: learn-verify-kit" "Teach, test, score, space: a gap becomes a declared competence, for the operator and for agents on the same cases." {
            skills = container "Seven skills" "learn, clarify, understand, revise, start, concept-sketch, track: the teaching loop as skills, no hooks, no config." "Claude skills" {
                perspectives {
                    "OSS equivalent" "KEEP. Nearest: Anki for spacing, open tutoring agents for the loop. Neither carries the 201 five-slot vocabulary, killer simulation as the bar, or the regression suite grown only from real errors; that discipline is the product. Basis: FROM-MEMORY."
                }
            }
            packets = container "Packets" "A frozen question bank per topic, with 101 and 201 cases and the five-slot vocabulary." "Markdown and JSONL, packets/" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP the bank, ADAPT one export. Anki's deck format is the OSS home for spaced retrieval on a phone; export each packet to it and keep the frozen bank here as the source. The case bank shared with HR (graded triplets by id) has no OSS equivalent. Basis: FROM-MEMORY."
                }
            }
            progress = container "Progress store" "Per-learner attempts, slope and mechanism share; never pooled across learners." "JSON, progress.json, learner-record.json" "Data Store" {
                perspectives {
                    "OSS equivalent" "KEEP at one or two learners. xAPI with a learning record store (Learning Locker) is the standard at scale; it adds a server and a statement schema for a benefit that appears only with many learners. Slope and mechanism share, kept apart and never pooled, are already the right two numbers. Basis: FROM-MEMORY."
                }
            }
            workTracking = container "Work tracking" "UNBUILT: reads real transcripts for concepts that reached a decision; the only outcome signal the spec lists." "Not built, spec O-5" {
                perspectives {
                    "OSS equivalent" "BUILD, small. No OSS reads a person's working transcripts for concepts that reached a decision; the nearest raw material is a trace store (Langfuse, Phoenix) and design-loop already keeps transcripts. The first version is a reader over the declared-weight rows, forty lines. Basis: spec O-5 UNBUILT; FROM-MEMORY on the genre."
                }
            }
        }

        /* PEOPLE AND EXTERNALS INTO PRODUCTION */
        operator -> askStore "Types asks into"
        operator -> reviewStore "Rules on candidates in"
        telegram -> todoist "A routine writes each link as a card to"
        granola -> todoist "Each meeting becomes a card in"
        todoist -> askStore "Board cards enter as proposals into"
        web -> ossDoors "Answers quoted queries from"
        agent -> driver "Advances hops on behalf of the operator in"

        /* INSIDE PRODUCTION */
        driver -> gates "Calls the current stage's door in"
        driver -> askStore "Reads the ask it carries from"
        falsifier -> probes "Reads criteria from and writes attacks to"
        falsifier -> reviewStore "Kills a candidate before it enters"
        gates -> reviewStore "Writes candidates to and admits jobs from"
        gates -> specStore "Freezes requirements into"
        gates -> registry "Admits machines into"
        ossDoors -> registry "Records adopt, adapt or build rulings for machines in"
        /* THE RAT ATTACK PATH, read from the run of PR-057 on 2026-09-07 */
        agent -> probeDoorway "Hands a four-field spec to"
        probeDoorway -> criteria "Scaffolds a criterion and its control in"
        probeDoorway -> ledgerDoor "Hands the built row to"
        ledgerDoor -> probes "Appends a validated row to"
        falsifier -> riskRanker "Asks for the risk order from"
        falsifier -> criteria "Runs the named criterion in"
        criteria -> ledgerDoor "Asks a dry-run of a decision row from"
        ledgerDoor -> decisionsLedger "Validates against and, on a real add, appends to"
        falsifier -> ledgerDoor "Amends the attack, the k and the lineage through"

        /* PEOPLE AND EXTERNALS INTO HR AND L&D */
        operator -> lifecycle "Starts, deploys and retires advisors through"
        operator -> feedback "Rates one advisor answer at a time in"
        operator -> skills "Learns 101 and 201 through"
        sourceLibrary -> buildLane "Supplies pages to"
        agent -> buildLane "Does extraction and judgment for"
        agent -> skills "Trains on the same cases through"

        /* INSIDE HR */
        lifecycle -> cartridges "Writes a newborn to and marks deployed in"
        riskMatrix -> buildLane "Ranks what P0 builds first for"
        buildLane -> cartridges "Writes graph and skill into"
        hrGuards -> cartridges "Fire on a candidate in"
        feedback -> feedbackLedger "Writes verdicts to"

        /* INSIDE L&D */
        skills -> packets "Reads questions and cases from"
        skills -> progress "Records attempts through the kit's door into"
        workTracking -> progress "ABSENT: would write decision signals to"

        /* THE NINE SEAMS, each read from the code that carries it (concept note 0b). ABSENT means
           the concept note proposes it and nothing on disk does it yet. */
        buildLane -> specStore "Writes JTBD specs with graded triplets into (skill_from_triplets.py:137)"
        gates -> riskMatrix "Shells risk_matrix --check from (matrix-gate.mjs:54)"
        feedback -> packets "Reads the RPD slots, miss codes and slope from (proficiency.py, operators.py:29)"
        falsifier -> cartridges "Runs PR-041 and PR-042 against HR's tree (checks/crit)"
        verifier -> hr "Verifies and renders HR's pipe model by root (0 problems, 2026-09-07)"
        ossDoors -> hr "Rules procurement for (OSS-035 to OSS-038)"
        progress -> riskMatrix "ABSENT: declared weights and levels, timestamped, into the matrix skeleton"
        reviewStore -> packets "ABSENT: an uncertain ruling becomes a gap row in"
        lifecycle -> gates "ABSENT: an installed advisor a production stage can name; no stage asks yet"
        cartridges -> packets "ABSENT on L&D's side: the case bank by triplet id, ordered by exposure, for both learners"
    }

    /* THE DIAGRAMS SHOW THE OUTCOME, NOT THE REASONING (chapter 12). The decision that shapes this
       picture is recorded beside it and can be argued with. */
    !adrs adrs

    views {
        /* THE C4 LADDER, EVERY RUNG DRAWN. The first draft skipped level one: each system's row in the
           rail opened straight onto its containers, so "what does production talk to" had no plate
           of its own and the operator asked where the system view was. A context view per system
           answers that with the neighbours and nothing inside; the landscape above it is the whole
           factory at one glance; the container views below are the insides. Titles are what the
           rail prints; descriptions are what the rail says on hover. */
        systemLandscape "Factory" "The three departments, the operator, and what comes in from outside." {
            title "The factory"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        systemContext production "ProductionContext" "What production talks to: the operator, the agent, the two other departments, and the repos and services outside." {
            title "Production and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        systemContext hr "HRContext" "What HR talks to: the operator, production, L&D, and the corpus on disk." {
            title "HR and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        systemContext ld "LDContext" "What L&D talks to: the learner, production, HR, and the books it teaches from." {
            title "L&D and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container production "Production" "The main pipe: stores, doors, the driver, the guard." {
            title "Inside production"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container hr "HR" "advisor-builder: lifecycle, matrix, build lane, guards, ledgers." {
            title "Inside HR"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container ld "LD" "learn-verify-kit: skills, packets, progress, and the unbuilt outcome signal." {
            title "Inside L&D"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        /* ONE RAT ATTACK, END TO END, scoped to production so containers may appear. TOLD TWICE ON
           ONE PLATE, on the operator's ruling of 2026-09-07: each arrow's label is the general
           statement, and the view carries the same hop as a worked example — the run of PR-057 at
           k=3 on 2026-09-07, read from its row — under drawing-office.example.<hop>. The viewer swaps
           every label on E; checks/hop-examples.mjs refuses a hop number no arrow has, and a view
           where only some hops carry one. The first draft was two views, and the rail showed two rows
           that said the same nine things. */
        dynamic production "RatAttack" "How any RAT attack runs: a spec becomes a probe row, the loop runs its criterion, the verdict is amended onto the row." {
            title "A RAT attack"
            properties {
                "structurizr.tooltips" "true"
                "drawing-office.example" "PR-057 at k=3, 2026-09-07: one attack with --only, 392 ms, FLIP from UNEVALUABLE to HELD"
                "drawing-office.example.1" "assumption: the approve act fits the decisions ledger as it stands · criterion: HELD on dry-run accepted, FALSIFIED on refusal, UNEVALUABLE if the door cannot be imported · command: node checks/crit/approve-row-shape.mjs · mode: reuse_missed"
                "drawing-office.example.2" "approve-row-shape.mjs already existed; staged, not scaffolded"
                "drawing-office.example.3" "Row built; id assigned: PR-057"
                "drawing-office.example.4" "Appended; baseline FALSIFIED: the door refused system: drawing-office"
                "drawing-office.example.5" "11 of 56 ranked; --only PR-057 narrows to one, 55 untouched"
                "drawing-office.example.6" "node checks/crit/approve-row-shape.mjs, 392 ms, exit 0"
                "drawing-office.example.7" "add pd in dry-run with system: harness"
                "drawing-office.example.8" "validators accepted; written plus DRY RUN; nothing written"
                "drawing-office.example.9" "PR-057 amended: k=3 HELD, command sha b07cff4e, FLIP from UNEVALUABLE"
            }
            agent -> probeDoorway "A spec of four fields: assumption (IS / IS NOT), criterion (what HELD, FALSIFIED, UNEVALUABLE mean), command, mode"
            probeDoorway -> criteria "Scaffolds the criterion and its control if absent; stages them so the ledger door sees a tracked file"
            probeDoorway -> ledgerDoor "Builds the twenty-field row from the contract; the door assigns the id"
            ledgerDoor -> probes "Validates, appends, mirrors; the first run stamps the baseline"
            falsifier -> riskRanker "Asks the risk order: exposure from the matrix, unranked rows after"
            falsifier -> criteria "Runs the criterion as a process; exit 0, 1 or 3 is the verdict"
            criteria -> ledgerDoor "A criterion may itself ask a door a question, in dry-run"
            ledgerDoor -> decisionsLedger "The door validates; a dry-run writes nothing"
            falsifier -> ledgerDoor "Amends the row: attack k, verdict, command sha, judged sha; a FLIP is printed"
            autoLayout lr 500 400
        }

        /* A DYNAMIC VIEW WITH NO SCOPE MAY ONLY SHOW PEOPLE AND SYSTEMS (the DSL refused the container
           form at export). The loop crosses three systems, so it is told at system level; the
           container-level seams it rides on are in the model above, and the ones marked ABSENT there
           are the same three hops marked ABSENT here. */
        dynamic * "TheLoop" "The loop the concept note says must close: an uncertain ruling becomes a gap, a declared weight ranks a hire, the hire is what production recruits." {
            title "The loop between departments"
            properties {
                "structurizr.tooltips" "true"
            }
            operator -> production "Cannot rule confidently on a candidate"
            production -> ld "ABSENT: the gap becomes a packet question"
            operator -> ld "Learns 101 then 201 on the case, declares weight and level"
            ld -> hr "ABSENT: the declaration lands in the risk matrix"
            hr -> production "ABSENT: the advisor it builds is one a production stage can name"
            autoLayout lr 500 400
        }

        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        styles {
            element "Element" {
                color #ffffff
                strokeWidth 2
                fontSize 26
            }
            element "Person" {
                shape Person
                background #32433b
                stroke #6fa588
            }
            element "Existing System" {
                background #32433b
                stroke #6fa588
            }
            element "Software System" {
                background #494d97
                stroke #a5a9f0
            }
            element "Container" {
                background #5f64af
                stroke #b9bdf5
            }
            element "Component" {
                background #8b92ce
                stroke #d2d5fa
                color #14162b
            }
            element "Data Store" {
                shape Cylinder
                background #5f64af
                stroke #b9bdf5
            }
            element "Channel" {
                shape Pipe
                background #5f64af
                stroke #b9bdf5
            }
            element "Deployment Node" {
                background #1F2226
                stroke #9aa4b2
                color #ffffff
            }
            element "Infrastructure Node" {
                background #5f64af
                stroke #b9bdf5
                color #ffffff
            }
            element "Modified" {
                stroke #ffb454
                strokeWidth 4
            }
            element "Proposal" {
                stroke #ff2fd0
                strokeWidth 6
            }
            element "Container Instance" {
            }
            element "Software System Instance" {
            }
            relationship "Relationship" {
                color #d7dbe3
                fontSize 24
            }
            relationship "Asynchronous" {
                color #d7dbe3
                fontSize 24
                dashed true
            }
        }
    }
}
