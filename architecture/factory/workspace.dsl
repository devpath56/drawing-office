/*
 * THE FACTORY AS ONE SYSTEM OF ELEVEN CONTAINERS, drawn from the operator's whiteboard of 2026-09-09
 * as ruled in design-loop core/plans/plan-factory-architecture.md ("The C4 container view — ruled
 * 2026-09-09") and re-framed here on 2026-09-15 at the operator's word: the three departments of
 * ADR 1 become one system; each machine is a container; the four control systems stay four boxes so
 * each one's missing interface stays visible; governance and RBAC wrap every container as a frame;
 * context and inference are containers the machines call. ADR 3 records the ruling.
 *
 * Delivery state is the plan's own table: Modified where the seat exists and the interface is
 * missing, Proposal where nothing exists yet, and every marked box carries a decision beside it or
 * sits under a parent whose marked child does. Operator control is drawn to component level — the
 * modules as they run — because the operator asked to double-click orient and see inside it, and
 * the handoff between one window's close and the next window's open is told once, as a trace, from
 * the real run of 2026-09-14.
 *
 * Component boxes name their module in the technology field and carry no `implementation`
 * property: checks/stage.mjs reads git in THIS repository and the modules live in design-loop, so a
 * pointer would read untracked. Their stage is reported as not claimed, never as built.
 */
workspace "The Factory" "Eleven machines inside one governance boundary, modelled 2026-09-15 from the whiteboard of 2026-09-09." {

    properties {
        "drawing-office.lenses" "Insight"
    }

    model {
        operator = person "Operator" "Admin (PD-034). Types asks, rules on tables, opens and closes windows, lands work." {
            perspectives {
                "Insight" "Two one-letter rulings in one evening: A on RQ3, then A on both\n· each landed as a decision row through the ledger door within minutes (PD-075, PD-076)\n· neither letter reached the ask store: the hook drops prompts under seven characters"
            }
        }
        second = person "Second operator" "Super user (PD-034). Rules on the store with the operator's roles." {
            perspectives {
                "Insight" "Named super user by PD-034; no pen row tonight carries a second operator id\n· plan-dmq-hire Q0 (PR-085) is FALSIFIED on exactly that: two operators declared, one seat\n· the roles are a boundary the frame draws and nothing yet enforces"
            }
        }

        targetCompany = softwareSystem "A target company" "Its own workflows; the boundary is what gets carried in." "Existing System" {
            perspectives {
                "Insight" "No company has received the boundary; the plugin layer that would carry it is two Proposal boxes\n· the operator's reading of 2026-09-09: the product is the harness-shaped factory, usable from Claude Code"
            }
        }
        audience = softwareSystem "The audience" "Answers back to distributed material; nothing reaches it yet." "Existing System" {
            perspectives {
                "Insight" "Nothing reaches it: no stage names a funnel or an audience (measured 2026-09-09)\n· the blog line is Sales's first product (PD-033) and its distribution edge is drawn ABSENT"
            }
        }
        web = softwareSystem "The web" "Where OSS candidates are searched, with a quoted query and a receipt." "Existing System" {
            perspectives {
                "Insight" "Every OSS candidate enters through a quoted query with a receipt; a search without one is refused\n· the roster's B1 signal is a live forum count, and bare surnames are refused as substring artefacts"
            }
        }
        deepseek = softwareSystem "DeepSeek OSS packages" "Unsearched candidates for the two plugins." "Existing System" {
            perspectives {
                "Insight" "Unsearched: neither plugin has been through the procurement doors\n· the two boxes are Proposals by the plugin-layer ruling of 2026-09-09, and their risk levels are declared, not measured"
            }
        }
        agent = softwareSystem "Agent in session" "Does the LLM work in the window the operator opened; no API key in any tree." "Existing System" {
            perspectives {
                "Insight" "The model today: every LLM turn ran in this window with no API key in any tree\n· 2026-09-14, one window: registered a probe, changed a door in a sibling repo, landed four commits through the gates\n· it named itself with the plan's full session name and recorded the title as a row (CF-173)"
            }
        }

        factory = softwareSystem "The Factory" "Eleven machines inside one governance boundary: an utterance becomes landed, proven work. modified — hover for details" "Modified" {
            perspectives {
                "Insight" "Eleven containers drawn 2026-09-15: four Modified, four Proposal, three ship as-is\n· the count of hired exec seats reads 0 of 13 (seats-hired, PR-084)\n· 26 checks are red on trunk and the session baseline attributes every one PRE-EXISTING"
            }
            group "governance-rbac: who may act, and what every act leaves behind" {

                operatorControl = container "Operator control" "orient, the reconciler, the ask handler; one human operator. modified — hover for details" "Node, prongs/orient.mjs" "Modified" {
                    perspectives {
                        "Insight" "Four of its pieces exist as modules and carry an Insight each; the reconciler is the fifth and is not built (PD-078)\n· the fan-out packet gained the worktree doors recipe tonight, after one window paid 28 refusals to land one criterion (CF-175)"
                    }
                    orient = component "orient" "PRICE FIRST, WHAT CHANGED, DoD QUEUE; --plan reads a plan's CP verdicts from the probe ledger in the main checkout." "Node, prongs/orient.mjs" {
                        perspectives {
                            "Insight" "Run four times on 2026-09-14 in one window: R1 FALSIFIED k=2, R2 UNREGISTERED then HELD k=3, twelve S rows refused UNRULED until the row cited PD-063\n· it reads the store's ledger through ledgerRoot, never the tree's stale copy (CF-168)\n· its next line is a fact, not an instruction: next: CP R1"
                        }
                    }
                    fanout = component "fan-out" "--take claims the first unheld plan of an owner, first row wins; --claim and --titled are ledger rows; prints the packet." "Node, prongs/fanout.mjs" {
                        perspectives {
                            "Insight" "22:50:20Z: --take fable returned Mon-14/9-Fable-1 on plan-hiring-line at HEAD fc8e87b; typed again at 23:55Z it returned the same plan\n· the packet gained the worktree doors recipe the same night (CF-175) after this window paid 28 refusals to land one criterion\n· the title row joins window, app session and plan (CF-174)"
                        }
                    }
                    sessionClose = component "session close" "Eleven steps: two human, declared; step 6 assumptions into the risk store; step 10 pastes the fan-out; step 11 rehearses." "Node, prongs/session-close.mjs" {
                        perspectives {
                            "Insight" "23:20Z on 2026-09-14: all eleven steps read ok; step 10 showed Fable-2 and Fable-3 held by other windows; step 11 handed one window a plan and flagged none\n· the human steps are declared with --did-group and --did-reflect, never detected\n· a session can read CLOSED having run none of its checkpoints (CF-157, carried as C-U7)"
                        }
                    }
                    planReader = component "plan-file reader" "Reads a plan's frontmatter and CP table: owner, session_name, status, rulings, each row's red proof and level." "Node, prongs/plan-file.mjs" {
                        perspectives {
                            "Insight" "Read plan-hiring-line for the take and for orient; the plan's session field was another window's until patched\n· twelve S rows read UNRULED until each row itself cited PD-063: the reader reads the row, never the prose beside it"
                        }
                    }
                    baseline = component "session baseline" "--inherit takes trunk's red set as the tree's baseline; attribution is a lookup: mine, PRE-EXISTING, FOREIGN, UNEVALUABLE." "Node, checks/session-baseline.mjs" {
                        perspectives {
                            "Insight" "Inherited at worktree creation: 284 checks, 26 red, 0 suite runs\n· the push gate falls back to the full suite when no run is recorded since capture, and the full suite counts trunk's reds as the session's (CF-166)\n· after one recorded run: 0 red caused by this session, 26 pre-existing"
                        }
                    }
                    queueRead = component "DoD reader" "prongs/queue-read.mjs: the DoD rows, actionable, ranked and unranked, never silently ordered by recency." "Node" {
                        perspectives {
                            "Insight" "24 open asks at session start, DL-008, DL-009 and DL-011 at the top\n· few rows carry a declared priority; the rest print as unranked rather than ordered by recency"
                        }
                    }
                    runLifecycle = component "run lifecycle" "The session's lifecycle over the run rows: what is half-built, what is open." "Node, prongs/run-lifecycle.mjs" {
                        perspectives {
                            "Insight" "One window, one close: all eleven steps read ok at 23:20Z\n· the same window re-took its plan at 23:55Z and the take returned the same packet, as designed"
                        }
                    }
                    askHook = component "ask hook" "Every operator prompt lands as one ask in the store through the hook, never typed by hand; prompts under seven characters are dropped." "Node, prongs/ask-log.mjs" {
                        perspectives {
                            "Insight" "The one-letter rulings of 2026-09-14 (A, A on both) are under the length floor and in no ask store; plan-chief-of-staff S2 names the hole\n· DL-021, the operator's commitment of 21:20Z, reached the request ledger by promotion and needed discovered_from before any later row could land"
                        }
                    }
                    planFiles = component "Plan files" "One file per plan, doored: written through door.mjs or receipted; frontmatter carries owner, session and rulings." "Markdown, core/plans/*.md" {
                        perspectives {
                            "Insight" "plan-hiring-line.md was edited three times tonight: by hand with a receipt, by patch.mjs twice\n· land refused the first commit until the receipt existed (PD-059)\n· its R2, RQ3 and RQ4 rows now read RULED, citing PD-075 and PD-076"
                        }
                    }
                    reconciler = component "reconciler" "Holds the operator's asks against the plan set, names what fell through, re-cuts a plan when a session surfaces new work. proposed — hover for details" "Not built; design-loop PD-078" "Proposal" {
                        !adrs adrs/reconciler
                        perspectives {
                            "Insight" "Not built. What it would have caught tonight: three gap rows written by hand (R-013 to R-015), and a request ledger that refused every append until an older row gained a field\n· session-close step 6 reconciles assumptions, not asks"
                        }
                    }
                }

                maintainerControl = container "Maintainer control" "runs the forty maintenance jobs; the operator sees only health. modified — hover for details" "Node, core/maintenance-jobs" "Modified" {
                    !adrs adrs/maintainer-control
                    perspectives {
                        "Insight" "Forty jobs in the maintenance_job store; the health line reads ABSENT (measured 2026-09-09)\n· no orient-equivalent runs them, so the operator sees nothing"
                    }
                }
                execControl = container "Exec control" "eleven domain seats, each answering one question. modified — hover for details" "Python, advisor-builder" "Modified" {
                    !adrs adrs/exec-control
                    perspectives {
                        "Insight" "2026-09-14: the hire door refuses a ranked seat without a registered machine (PR-086 HELD k=3); seats-hired reads 0 of 13\n· ousterhout reinstated (PD-075), the one cartridge with both a skill in daily use and a registered machine\n· the bar's precedence rule ruled (PD-076): when B1 and B2 split, B2 wins"
                    }
                }
                feedbackControl = container "Feedback control" "routes a finding, and scores whether the agent knew. modified — hover for details" "Node, four instruments" "Modified" {
                    !adrs adrs/feedback-control
                    perspectives {
                        "Insight" "Instruments unjoined: operator-moves, ask-yield, batch-rca, the failure ledger, three Brier surfaces\n· the figure called a Brier score is the average confidence on known-false claims, 0.6478 over nine (CAL1, unbuilt)\n· tonight's 26 reds were attributed by the baseline; nothing routed them to anyone"
                    }
                }

                discovery = container "Discovery" "an utterance, an incident, or a best practice becomes an admitted job (PD-059, R-008)" "Node, core/pipe.json" {
                    perspectives {
                        "Insight" "Its RAT path ran end to end on PR-086 today: registered red, flipped by a door change, HELD k=3\n· this window opened no run row; its checkpoints ran through orient and the falsifier"
                    }
                    driver = component "Pipe driver" "A durable state machine over the pipe model: one run row per piece of work, every hop's verdict on the row." "Node, core/pipe/run.mjs" {
                        perspectives {
                            "Insight" "Not on tonight's path: the window opened no run row; its checkpoints ran through orient and the falsifier"
                        }
                    }
                    gates = component "Admission doors" "jobs-gate, candidate-admission, job-admission, spec-freeze, registry-admission: each refuses a named thing." "Node, core/spec" {
                        perspectives {
                            "Insight" "Not on tonight's path: no candidate crossed an admission door; the door that changed was the hire door in advisor-builder\n· land refuses a staged module the registry does not know, which is why two rows were registered before the first land"
                        }
                    }
                    probeDoorway = component "Probe doorway" "Registers one probe: scaffolds the criterion and its control, builds the row from the contract, hands it to the ledger door." "Node, prongs/probe-new.mjs" {
                        perspectives {
                            "Insight" "2026-09-14: from a plan worktree every registration read UNEVALUABLE — inside a linked worktree — until the doorway resolved the ledger through the store root (CF-120's shape)\n· the tracked-criterion rule still needs the file in the store's tree, so a criterion lands first and registers second"
                        }
                    }
                    ledgerDoor = component "Ledger door" "The one writer of the probe, decision and request ledgers; runs each ledger's validator before a row lands; a dry run writes nothing." "Node, prongs/record.mjs" {
                        perspectives {
                            "Insight" "Wrote PR-086, PD-075, PD-076, PD-078 and R-013 to R-015 tonight; refused R-013 three times until DL-021 carried discovered_from\n· amend was used once, on DL-021, one field\n· every write ran from the main checkout: from a worktree the pen refuses (PD-027)"
                        }
                    }
                    riskRanker = component "Risk ranker" "Orders probes by exposure from the risk matrix; a probe with no mode runs after the ranked ones, never scored zero." "Node, core/risk/probe-rank.mjs" {
                        perspectives {
                            "Insight" "56 of 85 probes ranked by exposure; PR-086 carries mode nothing_enforced and ran on request with --only\n· governance was refused as a mode: the ids are the matrix's ranks, and the refusal now lists them (CF-175)"
                        }
                    }
                    criteria = component "Criteria" "One file per kill criterion: a pure judge() the control drives to every verdict; exit 0 HELD, 1 FALSIFIED, 3 UNEVALUABLE." "Node, checks/crit/*.mjs" {
                        perspectives {
                            "Insight" "hire-door.mjs: three fixture cartridges through the real door under a scratch HOME; its export surface trimmed to five so depth-bar's bar on an added module held\n· seats-hired.mjs gained --seat for the door and a reader for reinstatement rows; 27 controls pass"
                        }
                    }
                    falsifier = component "RAT falsifier" "Runs each probe's pre-registered criterion, risk-ordered; the baseline is stamped on the first run and a flip is printed." "Node, prongs/falsifier.mjs" {
                        perspectives {
                            "Insight" "PR-086: baseline FALSIFIED at k=1, FLIP to HELD at k=2, HELD at k=3, every run from the main checkout\n· the criterion was red because the door deployed F1 and F2; the flip followed the door change, never an edit to the row"
                        }
                    }
                }

                delivery = container "Delivery" "an admitted job becomes landed, proven work; the land door exists, the pipe does not. proposed — hover for details" "Node, checks/land.mjs" "Proposal" {
                    !adrs adrs/delivery
                    perspectives {
                        "Insight" "Four lands tonight by name, the last four commits on trunk; each ran the suite first so the push gate could attribute\n· the first push was refused on 26 reds that were trunk's, not the session's (CF-166's shape)\n· the leak scan refused a ledger snapshot carrying a home path; the store kept it, the tree did not"
                    }
                }
                distribution = container "Distribution" "finished material reaches an audience that answers back. proposed — hover for details" "Not built; design-loop PD-033" "Proposal" {
                    !adrs adrs/distribution
                    perspectives {
                        "Insight" "Nothing to cross: no stage names a funnel\n· the roster gained job 15, distribution, on 2026-09-10 (PD-042); no seat is hired for it"
                    }
                }
                stores = container "Stores" "every ledger, one pen, one project: asks, requests, probes, decisions, fan-out claims, gate runs." "SQLite and JSONL: core/store, failures, intent" "Data Store" {
                    perspectives {
                        "Insight" "Every write tonight went through record.mjs or register(), from the main checkout, then a snapshot was copied into the tree\n· PR-086, PD-075, PD-076, PD-078 and R-013 to R-015 landed this way\n· a worktree's copy is a snapshot; the store is the truth (PD-027)"
                    }
                }
                registry = container "Registry" "every machine, class and tool the factory can call by name. modified — hover for details" "JSON and SQLite: machinery.json, factory.db" "Data Store,Modified" {
                    !adrs adrs/registry
                    perspectives {
                        "Insight" "710 rows in machinery.json after crit-hire-door and test-hire-door registered tonight\n· registration from a worktree was refused: the registry is a store ledger and lives in the main checkout\n· its family field names the old pipe on 24 of 627 rows (measured 2026-09-09)"
                    }
                }
                contextPlugin = container "Context plugin" "what a session is handed at the moment it opens. proposed — hover for details" "DeepSeek OSS, unsearched" "Proposal" {
                    !adrs adrs/context-plugin
                    perspectives {
                        "Insight" "The packet is the context today: rename, claim, worktree line, doors recipe, CP table, bar, riskiest assumption\n· no package has been searched; the box is a Proposal by the plugin-layer ruling of 2026-09-09"
                    }
                }
                inferencePlugin = container "Inference plugin" "the model every machine runs on. proposed — hover for details" "DeepSeek OSS, unsearched" "Proposal" {
                    !adrs adrs/inference-plugin
                    perspectives {
                        "Insight" "Every machine asked the model in the window today; none asked a package\n· the risk matrix declares its level; nothing measures it"
                    }
                }
            }
        }

        /* PEOPLE AND EXTERNALS */
        operator -> askHook "Types asks into"
        second -> askHook "Types asks into"
        operator -> sessionClose "Closes a window through"
        operator -> fanout "Types orient <owner> in a new window; the take runs by absolute path"
        operator -> orient "Reads the price, the change and the queue from"
        operator -> baseline "Opens a worktree at trunk and inherits its baseline through"
        operator -> delivery "Lands the closing tree by name through"
        operator -> discovery "Runs a checkpoint's criterion and rules on candidates in"
        operator -> agent "Names the window with the plan's full session name in"
        operator -> maintainerControl "Sees only health from"
        operator -> execControl "Invokes a seat for a meeting in"
        fanout -> operator "Prints the packet to"
        agent -> probeDoorway "Hands a four-field probe spec and a forecast to"
        agent -> inferencePlugin "Is the model today, in the window"
        deepseek -> contextPlugin "Unsearched candidate for"
        deepseek -> inferencePlugin "Unsearched candidate for"
        web -> discovery "Answers quoted queries from the procurement doors of"
        factory -> targetCompany "Plugs into the workflows of; the boundary is what is carried in"
        distribution -> audience "ABSENT: reaches"

        /* INSIDE OPERATOR CONTROL */
        askHook -> stores "Appends one ask to"
        fanout -> planReader "Reads every plan's frontmatter through"
        fanout -> stores "Appends a claim row and a title row to (intent/fanouts.jsonl)"
        planReader -> planFiles "Parses"
        orient -> planReader "Reads the plan it opens on through"
        orient -> stores "Reads the probe ledger in the main checkout from"
        orient -> queueRead "Reads the DoD queue through"
        orient -> runLifecycle "Reads the session lifecycle through"
        sessionClose -> stores "Step 2 scans the ask ledger; step 6 puts every plan's assumptions into the risk store and through the falsifier"
        sessionClose -> fanout "Step 10 pastes the fan-out state; step 11 rehearses N windows against a copy"
        sessionClose -> planFiles "Step 4 checks plans and handoffs were written last"
        baseline -> stores "Reads the newest recorded run per control from the gate ledger"
        reconciler -> stores "ABSENT: holds the operator's asks against the plan set"
        reconciler -> planFiles "ABSENT: re-cuts a plan when a session surfaces new work"

        /* INSIDE DISCOVERY: the RAT attack path, read from the run of PR-086 on 2026-09-14 */
        driver -> gates "Calls the current stage's door in"
        driver -> stores "Reads the ask it carries from"
        gates -> stores "Writes candidates to and freezes requirements into"
        gates -> registry "Admits machines into"
        probeDoorway -> criteria "Scaffolds a criterion and its control in"
        probeDoorway -> ledgerDoor "Hands the built row to"
        ledgerDoor -> stores "Appends a validated row to"
        falsifier -> riskRanker "Asks for the risk order from"
        falsifier -> criteria "Runs the named criterion in"
        criteria -> ledgerDoor "May ask a door a question, in dry run"
        falsifier -> ledgerDoor "Amends the attack, the k and the lineage through"

        /* BETWEEN CONTAINERS, every edge measured in the plan's own table */
        feedbackControl -> discovery "A finding becomes a job row in"
        discovery -> delivery "ABSENT: a frozen spec row crosses; nothing refuses it (CL-004)"
        delivery -> distribution "ABSENT: a landed capability, a measured number"
        distribution -> feedbackControl "ABSENT: an audience response returns"
        delivery -> registry "Refuses a land that adds an unregistered module"
        delivery -> stores "Snapshots the store's ledgers into the tree before a commit"
        execControl -> stores "A seat's machine reads its census from"
        execControl -> discovery "The hire door asks the seats-hired criterion in"
        feedbackControl -> stores "Reads the failure and claim ledgers from"
        maintainerControl -> stores "Runs forty jobs over"
        operatorControl -> registry "Asks what already exists, by name or by question"
        maintainerControl -> registry "Asks what already exists, by name or by question"
        execControl -> registry "Asks what already exists, by name or by question"
        feedbackControl -> registry "Asks what already exists, by name or by question"
        discovery -> registry "Asks what already exists, by name or by question"
        operatorControl -> inferencePlugin "Asks the model"
        execControl -> inferencePlugin "Asks the model"
        discovery -> inferencePlugin "Asks the model"
        feedbackControl -> inferencePlugin "Asks the model"
        operatorControl -> contextPlugin "ABSENT: the packet, re-homed as what a session is handed at open"
    }

    /* THE DIAGRAMS SHOW THE OUTCOME, NOT THE REASONING (chapter 12). Workspace-level records sit
       here; each marked box carries its own under its element. */
    !adrs adrs

    views {
        systemLandscape "Factory" "The factory, the two operators, and what comes in from outside." {
            title "The factory"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        systemContext factory "FactoryContext" "What the factory talks to: the operators, the agent, the web, the packages, the company and the audience." {
            title "The factory and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container factory "TheFactory" "The Factory's eleven containers inside one governance boundary." {
            title "The eleven containers"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        /* DOUBLE-CLICK OPERATOR CONTROL ON THE PLATE ABOVE AND THIS IS WHAT OPENS: the modules as they
           run, and the one Proposal beside them. */
        component operatorControl "OperatorControl" "Inside operator control: orient, the fan-out, the session close, the readers, the ask hook, and the reconciler that is not built." {
            title "Inside operator control"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        component discovery "Discovery" "Inside discovery: the driver, the doors, the probe doorway, the ledger door, the ranker, the criteria and the falsifier." {
            title "Inside discovery"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        /* THE HANDOFF, END TO END: one window closes, trunk moves, the next window opens on a plan and
           runs its first checkpoint. Told twice on one plate, as the RAT trace is: each arrow is the
           general statement, and the key swaps every label for the real run — session 02d08c62 on
           plan-hiring-line, 2026-09-14. The close (23:20Z) and the open (22:50Z) are the SAME window's,
           told in handoff order, because the previous window's close output was not in the record. */
        dynamic operatorControl "Handoff" "How a table session hands off: the close reconciles and rehearses, the tree lands, a new window takes a plan, opens on its packet, and runs the first checkpoint." {
            title "The handoff"
            properties {
                "structurizr.tooltips" "true"
                "drawing-office.example" "Mon-14/9-Fable-1 on plan-hiring-line, 2026-09-14: session 02d08c62's close at 23:20Z and its open at 22:50Z, told in handoff order"
                "drawing-office.example.1" "node prongs/session-close.mjs --session 02d08c62 --last-ask 2026-09-14T22:50:00Z --did-group --did-reflect: all eleven steps read ok"
                "drawing-office.example.2" "day 2026-09-14: 1 ask, 1 session scanned; AS-98 (one seat per session at 60k tokens) in the risk store, PR-076 FALSIFIED"
                "drawing-office.example.3" "3 READY: Fable-2 held by 50df0a7d, Fable-3 by 30f29b98, Fable-1 taken; 2 HELD-BACK with no session_name; rehearsal: 1 window handed, 0 flagged"
                "drawing-office.example.4" "node checks/land.mjs by name: e399937 landed; trunk fast-forwarded and pushed f31ad9e..e399937"
                "drawing-office.example.5" "22:50:20Z: the operator types orient fable; node prongs/fanout.mjs --take fable reads session 02d08c62 from the environment"
                "drawing-office.example.6" "plan-hiring-line.md: owner fable, status open, session_name Mon-14/9-Fable-1, rulings PD-042 to PD-074; READY"
                "drawing-office.example.7" "intent/fanouts.jsonl gains name Mon-14/9-Fable-1, plan plan-hiring-line.md, session 02d08c62, head fc8e87b"
                "drawing-office.example.8" "the packet: HEAD fc8e87b, 19 CPs in order, bar level 5, riskiest assumption FALSIFIED (PR-076), hand-back by land"
                "drawing-office.example.9" "set_session_title Mon-14/9-Fable-1: first seat hired; --titled records app session local_698f8d8d as a ledger row"
                "drawing-office.example.10" "git worktree add mon-14-9-fable-1-02d08c62 at fc8e87b; --inherit: 284 checks, 26 red, 0 suite runs"
                "drawing-office.example.11" "orient --plan core/plans/plan-hiring-line.md: R1 FALSIFIED k=2, S1 FALSIFIED k=3, 17 UNREGISTERED; next: CP R1"
                "drawing-office.example.12" "failures/probes.jsonl in ~/dev/design-loop: PR-084 FALSIFIED hired 0 of 13"
                "drawing-office.example.13" "node checks/crit/seats-hired.mjs: FALSIFIED hired 0 of 13, cartridge-only 1 (qe-ic-advisor), none 12"
            }
            operator -> sessionClose "Closes the last window: session id, last ask, and the two human steps declared, never detected"
            sessionClose -> stores "Step 2 scans coverage against the ask ledger; step 6 puts every plan's assumptions through the falsifier"
            sessionClose -> fanout "Step 10 pastes the fan-out state; step 11 rehearses N windows per owner against a copy of the plan set"
            operator -> delivery "The closing tree lands by name; trunk fast-forwards onto it and is pushed"
            operator -> fanout "A new window types orient <owner>; the take reads the session id from the window's own environment"
            fanout -> planReader "Reads every plan's frontmatter: owner, session_name, status, rulings; READY, held, or held back"
            fanout -> stores "Claims the first unheld plan of that owner as a row; first row wins; typing it again returns the same plan"
            fanout -> operator "Prints the packet: the rename, the claim, the worktree line, the doors recipe, the CP table, the bar, the riskiest assumption"
            operator -> agent "Names the window with the plan's full session name and records the title as a ledger row"
            operator -> baseline "Adds a worktree at trunk and inherits trunk's red set as the tree's baseline, zero suite runs"
            operator -> orient "orient --plan reads the plan's CP verdicts; a level-5 checkpoint with no ruling is refused, not run"
            orient -> stores "Resolves the probe ledger through the store root, never the tree's copy"
            operator -> discovery "The first checkpoint's criterion runs; its verdict is the window's first fact"
            autoLayout lr 500 400
        }

        /* ONE RAT ATTACK, END TO END, re-scoped from the production system of ADR 1 to the discovery
           container: the doorway, the criteria, the ledger door, the ranker and the falsifier are its
           components, and the ledgers it reads and amends are the stores container. The worked
           example is PR-086 on 2026-09-14: registered red, then flipped by a door change. */
        dynamic discovery "RatAttack" "How any RAT attack runs: a spec becomes a probe row, the loop runs its criterion, the verdict is amended onto the row." {
            title "A RAT attack"
            properties {
                "structurizr.tooltips" "true"
                "drawing-office.example" "PR-086 on 2026-09-14: the hire door, registered FALSIFIED at k=1, then FLIP to HELD at k=2 and HELD at k=3 after the door changed"
                "drawing-office.example.1" "assumption: the hire door refuses a ranked seat below the bar · criterion: three fixture cartridges, F1 refused naming the machine, F2 refused naming C1, F3 deployed · command: node checks/crit/hire-door.mjs · mode: nothing_enforced · p_hold 0.05"
                "drawing-office.example.2" "hire-door.mjs and test-hire-door.mjs already written and staged; from a worktree the store's tracked-file rule refused until they landed"
                "drawing-office.example.3" "row built from the contract; id PR-086"
                "drawing-office.example.4" "appended after one validator accepted it; first run stamped the baseline FALSIFIED: F1 and F2 deployed"
                "drawing-office.example.5" "56 of 85 probes ranked by exposure; --only PR-086 narrows to one, 84 untouched"
                "drawing-office.example.6" "node checks/crit/hire-door.mjs: exit 1 at baseline, exit 0 after deploy_advisor.py gained the bar"
                "drawing-office.example.7" "the criterion asks nothing of a door; F3's map is judged by authority_map in the builder"
                "drawing-office.example.8" "PR-086 amended: k=2 FLIP FALSIFIED to HELD, then k=3 HELD; command sha pinned"
            }
            agent -> probeDoorway "A spec of four fields and a forecast: assumption, criterion, command, mode, p_hold"
            probeDoorway -> criteria "Scaffolds the criterion and its control if absent; the store door needs a tracked file"
            probeDoorway -> ledgerDoor "Builds the twenty-field row from the contract; the door assigns the id"
            ledgerDoor -> stores "Validates, appends, mirrors; the first run stamps the baseline"
            falsifier -> riskRanker "Asks the risk order: exposure from the matrix, unranked rows after"
            falsifier -> criteria "Runs the criterion as a process; exit 0, 1 or 3 is the verdict"
            criteria -> ledgerDoor "A criterion may itself ask a door a question, in dry run"
            falsifier -> ledgerDoor "Amends the row: attack k, verdict, command sha; a FLIP is printed"
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
