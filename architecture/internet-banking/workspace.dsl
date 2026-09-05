/*
 * The fictional Internet Banking System, from The C4 Model (Simon Brown, O'Reilly 2026).
 *
 * WHY THIS MODEL AND NOT OURS FIRST. Every diagram type this factory needs already exists in the
 * book for this one system: system context (ch03, figures 3-1 to 3-4), containers (ch04, 4-1 to
 * 4-6), components of the backend (ch05, 5-1 to 5-4), the sign-in dynamic view (ch07, 7-3 and 7-4),
 * dev and live deployment (ch08, 8-1 to 8-10), and the bank's landscape with departments (ch09,
 * 9-1 to 9-4). So the increments test the TOOLING; nothing here is invented, and every element can
 * be checked against a page. Local grounding, with anchors:
 *   Source authority content/c4-model-simon-brown-2026/md/ch03.md#... and the INDEX.md figure table.
 *
 * SCOPE OF THIS FILE TODAY: checkpoints 1 to 3 — the system context and the containers. Components,
 * the dynamic view, deployment and the landscape arrive at checkpoints 4, 6, 7 and 8, each with its
 * own review. A view that is not modelled yet is ABSENT, never a stub.
 */
workspace "Internet Banking System" "The fictional bank from The C4 Model, ch03: system context." {

    model {
        customer = person "Personal Banking Customer" "A customer of the bank, with personal bank accounts."

        /* CONTAINERS, ch04, in the book's own six steps. Two rulings from that chapter are modelled
           rather than paraphrased:
             · the static content is a DIRECTORY, not a web server, so chapter 8 can serve it by a
               different mechanism per deployment environment;
             · the S3 bucket is a CONTAINER and Simple Email Service is a SOFTWARE SYSTEM, because we
               own what goes in the bucket and merely call the email API. */
        /* THE BANK'S OWN CHANNEL SITS IN A DEPARTMENT TOO. The first draft grouped only the ATM and
           the core banking system, and left the internet bank ungrouped while the landscape's own
           description claimed "the two departments that own them" — a caption ahead of its model. */
        group "Digital Channels" {

        /* ── PERSPECTIVES, ch12 ───────────────────────────────────────────────────────────────
           The chapter's answer to "how do I add ownership without cluttering the diagram": not
           another diagram and not more subgroups, but "a layer on top of an existing diagram" that
           the reader toggles. Figure 12-1 is ownership over the landscape; figure 12-2 is security
           on the statement store. Both are modelled here rather than paraphrased. */
        internetBanking = softwareSystem "Internet Banking System" "Lets customers view information about their bank accounts, and make payments." {
            perspectives {
                "Ownership" "Digital Channels — Internet Banking team"
            }
            singlePageApp = container "Single-Page Application" "Provides all of the Internet banking functionality to customers via their web browser." "JavaScript and Angular"
            staticContent = container "Static Content" "Delivers the static content that makes up the single-page application." "Directory" {
                tags "Data Store"
            }
            /* COMPONENTS, ch05, in the book's own four steps: three API controllers built with Spring
               Web MVC, and four Spring beans behind them. The chapter's own note is kept: descriptions
               were dropped from ITS printed figures for space, not from the model, so they stay here. */
            backend = container "Backend" "Provides Internet banking functionality via a JSON/HTTP API, and makes calls to the Core Banking System." "Java and Spring Boot" {
                signInApi = component "Sign In API" "Allows users to sign in to the Internet Banking System." "Spring Web MVC"
                accountsSummaryApi = component "Accounts Summary API" "Provides customers with a summary of their bank accounts." "Spring Web MVC"
                statementApi = component "Statement API" "Allows customers to request a bank statement." "Spring Web MVC"
                securityComponent = component "Security Component" "Validates credentials, and issues and validates authentication tokens." "Spring Bean"
                emailComponent = component "Email Component" "Sends emails to customers." "Spring Bean"
                statementComponent = component "Statement Component" "Returns a cached statement, or generates one from the Core Banking System." "Spring Bean"
                coreBankingAdapter = component "Core Banking System Adapter" "Talks to the Core Banking System." "Spring Bean"
            }
            database = container "Database" "Stores user registration information and hashed authentication credentials." "MySQL" {
                tags "Data Store"
                /* THE SECOND CARRIER OF THE SECURITY LAYER, and it is here because checks/perspectives.mjs
                   refused the first draft: Security sat on the statement store alone, and toggling a
                   layer that dims everything but one box is a tooltip wearing a layer's clothes. The
                   database is not a filler — credentials at rest are the other half of the same story. */
                perspectives {
                    "Ownership" "Internet Banking team"
                    "Security" "Credentials stored as bcrypt hashes; encryption at rest; reachable only from the backend's subnet."
                }
            }
            statementStore = container "Statement Store" "Caches generated PDF bank statements." "AWS S3" {
                tags "Data Store"
                /* FIGURE 12-2's OWN EXAMPLE: security information about the statement store. The
                   chapter's point is that this would clutter the diagram if drawn, and reads fine as
                   a layer a reader turns on. */
                perspectives {
                    "Ownership" "Internet Banking team"
                    "Security" "Server-side encryption with SSE-S3; bucket policy denies public access; statements expire after 90 days."
                }
            }
        }

        atm = softwareSystem "ATM" "Lets customers withdraw cash and check balances." {
            tags "Existing System"
            perspectives {
                "Ownership" "Digital Channels — Self Service team"
            }
        }

        }

        /* ── THE WIDER LANDSCAPE, ch09 ────────────────────────────────────────────────────────────
           Figure 9-2's elements, and no more: the ATM and two more staff roles beside the customer,
           the internet bank, the core banking system and the email service. The chapter's own line
           is why they are here at all — a system context shows only what has a DIRECT relationship
           with the system in focus, while a landscape "shows a wider view to tell a broader story".

           THE DEPARTMENT BOUNDARIES ARE MINE, NOT THE BOOK'S. ch09 names a group or department as a
           common SCOPE for a landscape; figure 9-2 draws no departments. These two exist to test a
           preregistered claim — "group renders as a plain box with no name · systems land outside
           their department" — and where they put each system is a judgement about this fictional
           bank, so a reader is free to disagree with the grouping without disagreeing with the
           model. */
        group "Core Banking" {
            coreBanking = softwareSystem "Core Banking System" "Stores all of the core banking information about customers, accounts, transactions, etc." {
                tags "Existing System"
                perspectives {
                    "Ownership" "Core Banking — Platform team"
                }
            }
        }

        email = softwareSystem "Amazon Simple Email Service" "Sends emails to customers." {
            tags "Existing System"
            /* NOBODY IN THE BANK OWNS THIS, and saying so is the point of the layer: an ownership
               perspective whose value is a vendor is a different answer from a missing one. */
            perspectives {
                "Ownership" "Amazon Web Services — no team here owns it"
            }
        }

        serviceStaff = person "Customer Service Staff" "Customer service staff within the bank."
        backOffice = person "Back Office Staff" "Administration and support staff within the bank."

        customer -> internetBanking "Views account balances, and makes payments using"
        customer -> atm "Withdraws cash using"
        atm -> coreBanking "Uses"
        serviceStaff -> coreBanking "Uses"
        backOffice -> coreBanking "Uses"
        internetBanking -> coreBanking "Gets account information from, and makes payments using"
        internetBanking -> email "Sends emails using"
        email -> customer "Sends emails to"

        customer -> singlePageApp "Views account balances, and makes payments using"
        singlePageApp -> staticContent "Is delivered to the customer's web browser from"
        singlePageApp -> backend "Makes API calls to" "JSON/HTTP"
        backend -> database "Reads from and writes to" "SQL/TCP"
        backend -> statementStore "Reads from and writes to" "AWS S3 API"
        backend -> coreBanking "Gets account information from, and makes payments using" "XML/HTTPS"
        backend -> email "Sends emails using" "AWS SES API"

        /* Component relationships, ch05 steps 2 to 4. The three API controllers are entered from the
           UI; everything behind them is a bean, and only the beans reach a data store or an external
           system. That asymmetry is the story the component diagram tells. */
        singlePageApp -> signInApi "Makes API calls to" "JSON/HTTP"
        singlePageApp -> accountsSummaryApi "Makes API calls to" "JSON/HTTP"
        singlePageApp -> statementApi "Makes API calls to" "JSON/HTTP"

        signInApi -> securityComponent "Uses"
        accountsSummaryApi -> securityComponent "Uses"
        statementApi -> securityComponent "Uses"

        securityComponent -> database "Reads from and writes to" "SQL/TCP"
        securityComponent -> emailComponent "Uses"
        emailComponent -> email "Sends emails using" "AWS SES API"

        accountsSummaryApi -> coreBankingAdapter "Uses"
        statementApi -> statementComponent "Uses"
        statementComponent -> statementStore "Reads from and writes to" "AWS S3 API"
        statementComponent -> coreBankingAdapter "Uses"
        coreBankingAdapter -> coreBanking "Makes API calls to" "XML/HTTPS"

        /* ── DEPLOYMENT, ch08 ─────────────────────────────────────────────────────────────────────
           Two environments, because the chapter is explicit that one diagram cannot carry both: "I
           might run a Java application directly on a JVM on my laptop when doing development, but
           that same Java application might be built into a Docker image and deployed onto AWS."

           THE DEVELOPMENT ONE IS FOUR LEVELS DEEP ON PURPOSE — bank WAN, laptop, Docker, then the
           container engine inside it — because the preregistered redproof for this checkpoint says
           "nesting past two levels collapses or overlaps", and a topology that never nests could not
           put that to the test. */
        deploymentEnvironment "Development" {
            deploymentNode "Bank WAN" "All development happens inside the bank's own network." "Corporate network" {
                deploymentNode "Developer laptop" "Windows or macOS, chosen when an engineer joins." "Microsoft Windows or Apple macOS" {
                    deploymentNode "Web browser" "The UI is run locally so it can be debugged." "Chrome, Firefox, Safari or Edge" {
                        devSpa = containerInstance singlePageApp
                    }
                    deploymentNode "Java Virtual Machine" "The backend runs straight on a JVM here, not in a container." "OpenJDK" {
                        devBackend = containerInstance backend
                    }
                    deploymentNode "Docker" "Rather than install these on the laptop itself." "Docker Desktop" {
                        deploymentNode "nginx" "Serves the static content over a local address." "nginx 1.27" {
                            devStatic = containerInstance staticContent
                        }
                        deploymentNode "MySQL" "The same schema as live, one container away." "MySQL 8" {
                            devDatabase = containerInstance database
                        }
                    }
                }
            }
        }

        deploymentEnvironment "Live" {
            deploymentNode "Customer's computer" "Outside our infrastructure entirely." "Microsoft Windows or Apple macOS" {
                deploymentNode "Web browser" "Where the UI actually runs." "Chrome, Firefox, Safari or Edge" {
                    liveSpa = containerInstance singlePageApp
                }
            }
            deploymentNode "Cloudflare" "DNS, and a proxy in front of the static content." "Cloudflare" {
                cdn = infrastructureNode "ib.bigbank.com" "A CNAME aliasing the S3 bucket, proxied so static content is cached." "DNS CNAME"
                apiDns = infrastructureNode "ib-api.bigbank.com" "A CNAME aliasing the load balancer. Not proxied — API calls cannot be cached." "DNS CNAME"
            }
            deploymentNode "Amazon Web Services" "Where the majority of the software runs." "AWS" {
                lb = infrastructureNode "Application load balancer" "Forwards API traffic to the backend." "AWS ALB"
                deploymentNode "Fargate" "Runs the Docker image without provisioning servers." "AWS Fargate" {
                    liveBackend = containerInstance backend
                }
                deploymentNode "RDS" "AWS provisions the underlying infrastructure." "Amazon RDS" {
                    liveDatabase = containerInstance database
                }
                deploymentNode "S3" "Two buckets: the static content, and the generated statements." "Amazon S3" {
                    liveStatic = containerInstance staticContent
                    liveStore = containerInstance statementStore
                }
            }

            liveSpa -> cdn "Loads the UI from" "HTTPS"
            cdn -> liveStatic "Caches and serves" "HTTPS"
            liveSpa -> apiDns "Makes API calls to" "HTTPS"
            apiDns -> lb "Resolves to"
            lb -> liveBackend "Forwards traffic to" "HTTPS"
        }
    }

    views {
        /* A LANDSCAPE IS A SYSTEM CONTEXT WITHOUT A SYSTEM IN FOCUS — ch09's own framing — so it is
           the one view here that is scoped to the bank rather than to one of its systems. */
        systemLandscape "Landscape" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "The bank's systems and the people who use them, inside the two departments that own them."
        }

        systemContext internetBanking "SystemContext" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "The system in its world: who uses it, and what it talks to."
        }

        container internetBanking "Containers" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "Inside the system: the applications and data stores it is built from."
        }

        component backend "Components" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "Inside the backend: three API controllers, and the beans behind them."
        }

        deployment internetBanking "Development" "DeploymentDev" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "A laptop inside the bank's network: the UI in a browser, the backend on a JVM, and the rest in Docker."
        }

        deployment internetBanking "Live" "DeploymentLive" {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
            description "The UI runs on the customer's machine; almost everything else runs in AWS, with Cloudflare in front."
        }



        /* THE SIGN-IN FEATURE AT RUNTIME — ch07, figure 7-3, its six steps copied verbatim from the
           figure rather than paraphrased. The chapter's own caution is worth keeping beside it: it
           recommends dynamic diagrams SPARINGLY, for interesting or recurring patterns, because a
           hundred features do not want a hundred diagrams nobody maintains.

           WHY THIS VIEW EXISTS AND THE STATIC ONES DO NOT ANSWER IT: the static structure shows
           every element and relationship that exists. It cannot show which subset collaborates to
           deliver ONE feature, or in what order. That is the whole intent of a dynamic view.

           STEPS 4, 5 AND 6 ARE RETURNS, and returns are the thing to watch here: the static model
           has no database -> security, security -> sign-in or sign-in -> UI relationship, because
           nothing in the static picture flows that way. Whether this view can show a response
           without inventing static relationships is exactly what this checkpoint tests. */
        dynamic backend "SignIn" {
            properties {
                "structurizr.tooltips" "true"
            }
            singlePageApp -> signInApi "Submits credentials to"
            signInApi -> securityComponent "Validates credentials using"
            securityComponent -> database "select * from users where username = ?"
            database -> securityComponent "Returns user data to"
            securityComponent -> signInApi "Issues a session token if authentication succeeds"
            signInApi -> singlePageApp "Sends back a session token to"
            autoLayout lr 500 400
            description "Signing in: six steps, and three of them are the way back."
        }

        /* ── THE PALETTE, AND WHY EVERY VALUE IS A MEASUREMENT ────────────────────────────────────
           TAKEN FROM the operator's own NotebookLM mindmap, 2026-09-04, and mapped onto the same
           three states the viewer's level rail uses, so the picture and the rail cannot disagree:
             VIOLET  the thing in focus — this diagram is about it
             SLATE   a level you can open — a container, a component
             GREEN   the bottom — a person, an external system, a data store: nothing below it

           THE DEFECT THIS REPLACES was real and is measured: "Existing System" was #999999 with the
           renderer's white text, which is 2.85:1 — under the 4.5:1 floor for text, and it is the
           grey box the operator could not read.

           THE SECOND DEFECT IS THE ONE THE MINDMAP ITSELF HAS. Its fills are beautiful and they do
           not separate from its ground: #434950 on #1A1D22 is 1.9:1, so the card melts into the
           canvas and the whole plate reads as low contrast even though the TEXT is fine. Keeping
           those fills means the edge has to do the work, so every element carries a 2px stroke
           measured against the canvas rather than left to the renderer's default shade.

           MEASURED, white text on fill · stroke against the #1F2226 canvas:
             violet  #5F6285  5.88 · stroke #A5A9F0  7.25
             slate   #3F4650  9.53 · stroke #7C8798  4.39
             lighter #4A5361  7.77 · stroke #8A94A6  5.22
             green   #3A4E42  8.94 · stroke #6FA588  5.64
             relationship line and label #A5A9F0 / #D7DBE3 on canvas: 7.25 and 11.51 */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
        /* GENERATED FROM architecture/theme.json by checks/diagram-contrast.mjs --write.
           Edit the theme, not this block: the check refuses any drift between them. */
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
                background #2b3a33
                stroke #6fa588
            }
            element "Existing System" {
                background #2b3a33
                stroke #6fa588
            }
            element "Software System" {
                background #3f4383
                stroke #a5a9f0
            }
            element "Container" {
                background #5a5fa6
                stroke #b9bdf5
            }
            element "Component" {
                background #8b92ce
                stroke #d2d5fa
                color #14162b
            }
            element "Data Store" {
                shape Cylinder
                background #5a5fa6
                stroke #b9bdf5
            }
            element "Channel" {
                shape Pipe
                background #5a5fa6
                stroke #b9bdf5
            }
            element "Deployment Node" {
                background #1F2226
                stroke #9aa4b2
                color #ffffff
            }
            element "Infrastructure Node" {
                background #1F2226
                stroke #9aa4b2
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
