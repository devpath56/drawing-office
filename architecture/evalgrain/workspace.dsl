/*
 * THE EVAL-GRAIN AUDITOR (I) — hackathon v0.
 *
 * It exists for one bug, CF-262: an eval grouped replayed spans by a repeated label ("LLM call 9")
 * and scored other sessions' spans as this run's, so another run's artifacts were credited to this
 * one. The auditor verifies that the traces an eval scored actually BELONG to the target run, and
 * when they do not the claim closes as UNEVALUABLE — never a score.
 *
 * WHAT IS OURS AND WHAT IS NOT. TrueForge is an existing system we call rather than build: the
 * session API and its SSE stream, the events replay endpoint, the judge model config, and the
 * approval gate are all theirs. The gate is the point: the contaminated path pauses on TrueForge's
 * NATIVE approval gate rather than a refusal UI of our own — we did not build a gate, we borrowed
 * theirs, and architecture/evalgrain/adrs/001 is the argument.
 *
 * THE SSE STREAM IS A RELATIONSHIP, NOT A CHANNEL. It is a live stream off an existing system's
 * API, not a queue or topic this model owns, so it is an Asynchronous edge and not a container.
 * Drawing it as a box would claim a data store nobody here operates.
 */
workspace "Eval-Grain Auditor" "Verifies that the traces an eval scored belong to the target run; contamination closes as UNEVALUABLE." {

    model {
        operator = person "Eval Operator" "Runs the eval demo; approves or rejects scoring paused at the approval gate."

        evalharness = softwareSystem "Eval Harness" "Runs eval sessions, scores spans with the LLM judge, groups spans by label, and builds the span claim. The system the auditor audits." {
            provisioner = container "Session Provisioner" "Stubs up the harness and provisions eval sessions on TrueForge."
            grouper = container "Span Grouper" "Replays session events and groups spans by repeated label (e.g. 'LLM call 9') — the grouping that caused CF-262."
            claimbuilder = container "Claim Builder" "Builds the span claim the eval presents for scoring."
        }

        evalgrain = softwareSystem "Eval-Grain Auditor (I)" "Hackathon v0. Verifies the traces an eval scored actually belong to the target run. Contamination closes as UNEVALUABLE — never a score." {
            registry = container "Trace-Ownership Registry" "Fingerprints every live SSE event to (session, turn, event). The source of truth for span ownership."
            checker = container "Membership Checker" "Pre-step check: tests every claimed span against the registry. Intruder found → refuse to score."
            receipts = container "Receipt Writer" "Writes the SCORED receipt, or UNEVALUABLE listing every foreign span with its true owner IDs. Logged durably."
            eventlog = container "SessionEvent Log" "Append-only SessionEvent log (SQLite)." "SQLite" "Data Store"
        }

        /* NOT OURS: we call it, we do not build it. */
        trueforge = softwareSystem "TrueForge" "Local single-process platform (npx, SQLite): REST + SSE sessions, events replay, LLM-as-judge model config, native approval gates." "Existing System" {
            sessionapi = container "Session API" "Session lifecycle over REST; live session events over SSE (id + thread_id + sequence)."
            replay = container "Events Replay" "GET events endpoint; replays a session's event history."
            judge = container "LLM-as-Judge" "Judge model on the provided OpenAI API via TrueForge model config. The judge is what gets audited."
            gate = container "Approval Gate" "Native approval gate; pauses scoring when the auditor reports contamination."
        }

        operator -> evalharness "Runs the eval demo"
        operator -> evalgrain "Reviews SCORED / UNEVALUABLE receipts"
        evalharness -> evalgrain "Presents span claims for audit"
        evalgrain -> evalharness "Refuses contaminated scoring"
        evalharness -> trueforge "Provisions sessions, replays events, scores spans"
        evalgrain -> trueforge "Fingerprints live events; raises approval pauses"

        operator -> provisioner "Stubs up the harness"
        provisioner -> sessionapi "Provisions sessions"
        /* THE LIVE STREAM. Asynchronous because the registry does not call for each event and wait;
           the events arrive as TrueForge produces them. */
        sessionapi -> registry "Streams session events" "SSE" "Asynchronous"
        registry -> eventlog "Appends fingerprinted events"
        grouper -> replay "Replays session events"
        grouper -> judge "Submits spans for scoring"
        grouper -> claimbuilder "Hands grouped spans"
        claimbuilder -> checker "Presents span claim"
        checker -> registry "Looks up true owners"
        checker -> receipts "Reports verdict"
        receipts -> eventlog "Logs receipt durably"
        receipts -> gate "Pauses scoring for human review"
        gate -> operator "Requests approval decision"
        operator -> gate "Approves or rejects paused scoring"

        deploymentEnvironment "Local" {
            laptop = deploymentNode "Demo laptop" "Everything in this v0 runs on one machine." "macOS" {
                tfbox = deploymentNode "TrueForge single-process (npx)" "npx @truefoundry/trueforge, one process, SQLite." "Node.js" {
                    tfSessionApi = containerInstance sessionapi
                    tfReplay = containerInstance replay
                    tfJudge = containerInstance judge
                    tfGate = containerInstance gate
                }
                demobox = deploymentNode "Eval demo process" "The harness and the auditor run together in the demo process." "Node.js" {
                    demoProvisioner = containerInstance provisioner
                    demoGrouper = containerInstance grouper
                    demoClaimBuilder = containerInstance claimbuilder
                    demoRegistry = containerInstance registry
                    demoChecker = containerInstance checker
                    demoReceipts = containerInstance receipts
                    demoEventLog = containerInstance eventlog
                }
            }
        }
    }

    !adrs adrs

    views {
        systemContext evalgrain "context" "Who runs the eval, what audits it, and whose platform it all sits on." {
            title "The auditor and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container evalharness "harness" "The system under audit: provision, replay, group, claim." {
            title "Inside the eval harness"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container evalgrain "auditor" "Registry, checker, receipts, and the append-only log behind them." {
            title "Inside the auditor"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container trueforge "trueforge" "The existing platform: sessions, replay, judge, and the gate we borrowed." {
            title "Inside TrueForge"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        dynamic evalgrain "happy-path" "One clean run: every claimed span is owned, so it scores." {
            title "A clean run → SCORED"
            properties {
                "structurizr.tooltips" "true"
            }
            operator -> provisioner "Stubs up the harness"
            provisioner -> sessionapi "Provisions session"
            sessionapi -> registry "Streams session events"
            registry -> eventlog "Appends fingerprinted (session, turn, event)"
            grouper -> replay "Replays session events"
            grouper -> judge "Submits spans for scoring"
            grouper -> claimbuilder "Hands grouped spans"
            claimbuilder -> checker "Presents span claim"
            checker -> registry "Looks up true owners"
            checker -> receipts "Reports clean verdict — all spans owned"
            receipts -> eventlog "Logs SCORED receipt durably"
            autoLayout lr 500 400
        }

        dynamic evalgrain "error-path" "CF-262, caught: spans grouped by repeated label bring in another session's, and nothing scores." {
            title "A contaminated run → UNEVALUABLE"
            properties {
                "structurizr.tooltips" "true"
            }
            operator -> provisioner "Stubs up the harness"
            provisioner -> sessionapi "Provisions 2–3 sessions"
            sessionapi -> registry "Streams session events"
            registry -> eventlog "Appends fingerprinted (session, turn, event)"
            grouper -> replay "Replays session events"
            grouper -> judge "Submits spans for scoring"
            grouper -> claimbuilder "Hands spans grouped by repeated label ('LLM call 9')"
            claimbuilder -> checker "Presents span claim — includes foreign spans"
            checker -> registry "Looks up true owners"
            checker -> receipts "Reports contamination — intruder found"
            receipts -> eventlog "Logs UNEVALUABLE with every foreign span and its true owner IDs"
            receipts -> gate "Pauses scoring for human review"
            gate -> operator "Requests approval decision — scoring paused"
            operator -> gate "Rejects — nothing scores without approval"
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
