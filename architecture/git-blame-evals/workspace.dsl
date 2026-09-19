/*
 * GIT-BLAME-EVALS — git blame for evals: every span answers to the run that made it.
 *
 * MODELLED FROM THE CODE, NOT FROM A DESCRIPTION OF IT. The identifiers, the endpoints, the module
 * boundaries and the three verdicts are read off TrueForge-Hackathon/auditor, and nothing here is
 * invented.
 *
 * AND THE CODE IS NOT IN THIS REPO, WHICH IS WHY NO BOX NAMES ITS IMPLEMENTATION. The theme's
 * `implementation` property is a repo-relative path, and checks/stage.mjs judges it against THIS
 * repo's tracked files for a reason it states plainly: "a reader of HEAD does not get this file,
 * whether or not it sits on somebody's disk". Pointed at ../TrueForge Hackathon/auditor every rung
 * read FAILED — ten claims that do not hold here — so the pointers are gone and every box sits at
 * `designed`, which is the truth for a model that lives apart from its code. Move this model into
 * the auditor repo and the same property resolves.
 *
 * THE BUG IT REPRODUCES, CF-262. A label like "LLM call 9" is unique only WITHIN a session. Reuse
 * it as a grouping key across sessions and three runs' spans merge into one claim — and every span
 * the eval collected is real, well-formed and individually valid, so nothing inside the eval can
 * notice. Only provenance can.
 *
 * WHY THE AUDIT IS NOT CIRCULAR, and it is the whole design. Ownership and the claim come from TWO
 * INDEPENDENT TrueForge views: ownership from the LIVE SSE stream, the claim from REPLAY. An audit
 * that read one view twice would be checking a copy of itself and could not fail.
 *
 * THREE VERDICTS, NOT TWO, because a claimed span the target does not own splits two ways and they
 * indict different parties: UNEVALUABLE is a fact about the EVAL (a span is held under another
 * session); UNWITNESSED is a fact about the AUDITOR (the registry never saw it, so there is nobody
 * to name). Collapsing them would let the auditor's own blind spot read as the eval's fault.
 */
workspace "git-blame-evals" "Verifies that every span an eval scored actually belongs to the run being scored." {

    model {
        operator = person "Eval Operator" "Types approve or reject at the pause. The gate never decides without one."

        /* THE SYSTEM CARRIES THE STATE ITS CHILD CARRIES, because checks/delivery.mjs refuses a parent
           that holds a marked box and says nothing: one level up — the plate a reviewer actually opens to
           ask what changed — it would be drawn as untouched. It inherits the child's argument rather than
           needing a second decision, which is the rule the control pins. */
        gitBlameEvals = softwareSystem "git-blame-evals" "modified — hover for details. Audits an eval run for trace ownership. Contamination closes as UNEVALUABLE, and a blind spot closes as UNWITNESSED — neither becomes a score." "Modified" {

            audit = container "Audit" "Compares the live stream against the replay and emits exactly one terminal verdict." "Python"
            registry = container "Ownership Registry" "A dict keyed by (session_id, turn_id, event_id). The audit is a membership test against it — nothing more." "Python"
            transport = container "TrueForge Transport" "JSON calls and live SSE ingest. No host or port literal appears in the package; an unset base URL is an error, never a guessed default." "Python"
            grain = container "Eval Grain" "Two grouping strategies over the same replay rows: by event id, which is globally unique, or by label, which is CF-262." "Python"
            contract = container "Verdict Contract" "Exactly one terminal verdict per audit, written once and never mutated. Writes the receipt and appends the ledger from the same value it displayed." "Python"
            router = container "Approval Router" "Routes UNEVALUABLE to TrueForge's native gate. Prompts and blocks; with no TTY and no flag it refuses to proceed rather than choosing for you." "Python"
            scoreTool = container "score_eval MCP Server" "One approval-gated tool, and the enforcement point: it scores registry-owned spans ONLY, so an approval can never launder a foreign one." "Python · MCP"
            provisioner = container "Provisioner" "Registers the model provider, an agent, a session, and the remote MCP server." "Python"
            fixtureBuilder = container "CF-262 Fixture" "Sessions whose span labels collide by construction: every session runs the same number of calls, so 'LLM call 9' exists in all of them and points at a different real event in each." "Python"
            /* THE ONE BOX THAT IS NOT THE REAL THING, and it says so in the field the renderer
               prints. The README calls it a LABELED FALLBACK: it stubs the model's TEXT only, while
               every TrueForge object the auditor reads stays real. It is `Modified` rather than
               `Proposal` because TrueForge's model-provider seam already ships — you swap it for a
               real provider by pointing at api.openai.com — so this is our content in somebody
               else's extension point, which is exactly what that state means. */
            stubModel = container "Stub Model" "modified — hover for details. A deterministic OpenAI-compatible endpoint that stubs the model's text only; every TrueForge object the auditor reads is real." "Python · HTTP" "Modified" {
                !adrs adrs-stub
            }
            receiptStore = container "Receipts" "One receipt per run, and receipts/verdicts.jsonl — an append-only ledger where every row cites its receipt." "JSON · JSONL" "Data Store"
        }

        /* NOT OURS. We call it, we do not build it, and the gate is the point: we did not build a
           gate, we borrowed theirs. */
        trueforge = softwareSystem "TrueForge" "The platform the eval runs on: sessions and turns, an SSE stream, event replay, an MCP client and a native tool-approval gate." "Existing System" {
            sessionsApi = container "Sessions & Turns API" "POST /turns with stream=true. The live SSE stream is where ownership is established, because it says what arrived and on whose stream."
            replayApi = container "Events Replay" "GET /sessions/{id}/events. The independent second view: what the eval says it scored."
            mcpClient = container "MCP Client" "Discovers the remote MCP server and attaches score_eval with require_approval_for_tools."
            approvalGate = container "Approval Gate" "Emits tool.approval_required and pauses the turn. Resumes on a user.tool_approval input carrying allow or deny."
            modelProvider = container "Model Provider" "The judge model endpoint. Points at the stub here, or at a real provider instead."
        }

        operator -> gitBlameEvals "Types approve or reject at the pause"
        gitBlameEvals -> trueforge "Ingests live events, replays the claim, and offers score_eval for approval"
        trueforge -> gitBlameEvals "Pauses the scoring tool until a human decides"

        provisioner -> sessionsApi "Registers the provider, an agent and a session"
        provisioner -> mcpClient "Registers the remote MCP server"
        transport -> sessionsApi "Opens the live turn and reads its events" "SSE" "Asynchronous"
        transport -> replayApi "Replays the session's events"
        audit -> transport "Ingests the live turn, then the replay"
        audit -> registry "Fingerprints each live event to (session, turn, event)"
        audit -> grain "Groups replay rows into the eval's claim"
        audit -> fixtureBuilder "Builds the colliding-label fixture"
        audit -> contract "Hands the registry and the claim over for one verdict"
        contract -> registry "Tests every claimed span for membership"
        contract -> receiptStore "Writes the receipt and appends the ledger"
        modelProvider -> stubModel "Calls the stubbed completion endpoint"
        router -> receiptStore "Reads the UNEVALUABLE receipt, and records exactly one decision"
        router -> approvalGate "Calls score_eval and blocks on the pause"
        router -> operator "Shows the foreign spans and their true owners, and waits"
        operator -> router "Types the decision"
        approvalGate -> mcpClient "Releases the paused call on allow"
        mcpClient -> scoreTool "Calls score_eval"
        scoreTool -> receiptStore "Scores the owned subset only, read from the receipt"

        deploymentEnvironment "Local" {
            laptop = deploymentNode "Demo laptop" "One command, both verdicts, and the pause." "macOS" {
                tfProcess = deploymentNode "TrueForge (npx, single process)" "Sessions, SSE, replay, the MCP client and the gate." "Node.js · SQLite" {
                    tfSessions = containerInstance sessionsApi
                    tfReplay = containerInstance replayApi
                    tfMcp = containerInstance mcpClient
                    tfGate = containerInstance approvalGate
                    tfProvider = containerInstance modelProvider
                }
                demoProcess = deploymentNode "run-demo.sh" "The auditor's own modules, run in order." "Python 3" {
                    dAudit = containerInstance audit
                    dRegistry = containerInstance registry
                    dTransport = containerInstance transport
                    dGrain = containerInstance grain
                    dContract = containerInstance contract
                    dRouter = containerInstance router
                    dProvisioner = containerInstance provisioner
                    dFixture = containerInstance fixtureBuilder
                    dReceipts = containerInstance receiptStore
                }
                stubProcess = deploymentNode "Backgrounded helpers" "Started by run-demo.sh if not already running." "Python 3" {
                    dStub = containerInstance stubModel
                    dScoreTool = containerInstance scoreTool
                }
            }
        }
    }

    !adrs adrs

    views {
        systemContext gitBlameEvals "context" "Who decides, and whose platform it all runs on." {
            title "The auditor and its neighbours"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container gitBlameEvals "auditor" "Ten modules: ingest, registry, grain, verdict, gate, and the tool that enforces it." {
            title "Inside the auditor"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        container trueforge "trueforge" "The platform's own halves: two independent views, an MCP client, and the gate we borrowed." {
            title "Inside TrueForge"
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }

        dynamic gitBlameEvals "scored" "The eval groups by event id, which is globally unique, so every claimed span resolves to the target." {
            title "Grouped by event id → SCORED"
            properties {
                "structurizr.tooltips" "true"
            }
            provisioner -> sessionsApi "Registers the provider, an agent and a session"
            audit -> transport "Ingests the live turn"
            transport -> sessionsApi "Opens the live turn and reads its events"
            audit -> registry "Fingerprints each live event to (session, turn, event)"
            transport -> replayApi "Replays the session's events"
            audit -> grain "Groups the replay rows by event id"
            audit -> contract "Hands the registry and the claim over"
            contract -> registry "Every claimed span is owned"
            contract -> receiptStore "Writes SCORED and appends the ledger"
            autoLayout lr 500 400
        }

        dynamic gitBlameEvals "unevaluable" "The same rows grouped by label: 'LLM call 9' exists in three sessions, so foreign spans enter the claim." {
            title "Grouped by label → UNEVALUABLE"
            properties {
                "structurizr.tooltips" "true"
            }
            audit -> fixtureBuilder "Builds sessions whose labels collide by construction"
            audit -> registry "Fingerprints every live event across all of them"
            audit -> grain "Groups the replay rows by label — CF-262"
            audit -> contract "Hands the registry and the claim over"
            contract -> registry "18 of 27 claimed spans are held under another session"
            contract -> receiptStore "Writes UNEVALUABLE, naming every foreign span and its true owner"
            autoLayout lr 500 400
        }

        dynamic gitBlameEvals "pause" "Scoring is an MCP tool, so the platform's own gate can stop it — and the tool, not the gate, is what foreign spans cannot get past." {
            title "The pause, and exactly one decision"
            properties {
                "structurizr.tooltips" "true"
            }
            router -> receiptStore "Reads the UNEVALUABLE receipt"
            router -> approvalGate "Calls score_eval, and the turn pauses"
            router -> operator "Shows the foreign spans and their true owners"
            operator -> router "Types approve, or reject"
            approvalGate -> mcpClient "Releases the paused call on allow"
            mcpClient -> scoreTool "Calls score_eval"
            scoreTool -> receiptStore "Scores the owned subset only — approval widens nothing"
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
