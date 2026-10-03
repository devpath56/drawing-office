/*
 * DRAWING OFFICE, DRAWN WITH ITS OWN TOOLS — and carrying one proposal on top of what ships.
 *
 * What ships is drawn as it is: a model is a DSL file with its decision records; tools/ produce (the
 * build, the trace frames, the exports) and checks/ refuse; structurizr-cli and Graphviz turn the DSL
 * into the workspace and the site the viewer reads.
 *
 * THE PROPOSAL is a page per model: tools/page.mjs writes architecture/<name>/page.html, one file a
 * reviewer opens from anywhere, with every view, the traces walkable or playing by themselves, a box
 * that opens into what is inside it, and the traces that pass through any box. Delivery state follows
 * this repo's own convention: Proposal where nothing exists upstream yet, Modified where a part ships
 * and the proposal changes it, and every marked box carries the decision that says why.
 */
workspace "Drawing Office" "Architecture diagrams as a versioned model, with one proposal drawn on top: a page per model." {

    model {
        author = person "Model author" "Writes a system's model and its decision records, then builds and checks them."
        reviewer = person "Reviewer" "Reads a model: in the viewer today, or in a page sent to them under the proposal."

        structurizr = softwareSystem "structurizr-cli" "Turns the DSL into the workspace JSON, the static site and Graphviz DOT." "Existing System"
        graphviz = softwareSystem "Graphviz" "Lays a view out; the static export half-writes without it." "Existing System"
        playwright = softwareSystem "Playwright and Chromium" "Renders the served site, so label collisions can be measured and SVGs exported." "Existing System"
        git = softwareSystem "Git" "Says which files are tracked, so derived ones can be refused." "Existing System"

        office = softwareSystem "Drawing Office" "Diagrams as a versioned model: the palette, the step order and the label collisions are checked. modified — hover for details" "Modified" {

            models = container "Models" "One system per directory: architecture/<name>/workspace.dsl and its decision records." "Structurizr DSL, Markdown" "Data Store"
            palette = container "Palette" "architecture/theme.json: the colours, the ramp, the floors and the delivery strokes every model is drawn in." "JSON" "Data Store"
            exports = container "Exports" "workspace.json, the static site and index.json, rebuilt from the models and never committed." "JSON, static site" "Data Store"

            tools = container "Tool scripts" "tools/: each script writes something (the exports, trace frames, SVGs and, proposed, the page) or recommends; none passes judgement. modified — hover for details" "Node command-line scripts" "Modified" {
                build = component "build" "Every model: stamps the palette, exports workspace.json and the site, writes the index." "tools/build.mjs"
                animate = component "trace-animate" "Gives each trace the animation frames the exporter does not write." "tools/trace-animate.mjs"
                suggest = component "trace-suggest" "Recommends which features deserve a trace." "tools/trace-suggest.mjs"
                svgExport = component "diagram-export" "One SVG per view, with its diagram key." "tools/diagram-export.mjs"
                collisions = component "diagram-collisions" "Measures the served page for labels lying across boxes." "tools/diagram-collisions.mjs"
                serve = component "serve" "Serves the viewer and the site on localhost:8015." "tools/serve.mjs"
                page = component "page" "One self-contained page per model: every view, traces to walk or play, boxes that open, traces through a box. proposed — hover for details" "tools/page.mjs" "Proposal" {
                    !adrs adrs-page
                }
                template = component "page template" "The page's layout and its script; the colours are filled in from the palette. proposed — hover for details" "tools/page-template.html" "Proposal" {
                    !adrs adrs-template
                }
            }

            checks = container "Check scripts" "checks/: each script reads the models and exports and exits non-zero when one breaks a rule (colours, step order, decisions, derived files); npm run check runs them all. modified — hover for details" "Node command-line scripts" "Modified" {
                contrast = component "diagram-contrast" "Palette drift, contrast floors, the lightness ladder and contiguous trace steps." "checks/diagram-contrast.mjs"
                projects = component "projects" "The one door every check discovers models and the palette through." "checks/projects.mjs"
                delivery = component "delivery" "A box marked Proposal or Modified must carry the decision that says why." "checks/delivery.mjs"
                decisions = component "decisions" "Every decision has a status in Nygard's vocabulary and governs a drawn box." "checks/decisions.mjs"
                diagramKey = component "diagram-key" "Every style a view draws is on its key, and every key row is drawn somewhere." "checks/diagram-key.mjs"
                pubsub = component "pubsub" "Queues and topics are containers; a message bus never is." "checks/pubsub.mjs"
                derived = component "derived" "Nothing the exporter makes is committed; it now knows the page and its scratch too. modified — hover for details" "checks/derived.mjs" "Modified" {
                    !adrs adrs-derived
                }
                testTools = component "test-tools" "The control over tools/ that have none of their own; it now runs the page's planted faults. modified — hover for details" "checks/test-tools.mjs" "Modified" {
                    !adrs adrs-test-tools
                }
            }

            viewer = container "Viewer" "architecture/viewer.html: a rail of every model, the site's renderer, the traces stepped frame by frame." "HTML, JavaScript"
            modelPage = container "Model page" "architecture/<name>/page.html: one file per model that opens from anywhere, offline. proposed — hover for details" "HTML" "Proposal" {
                !adrs adrs-model-page
            }
        }

        # what ships
        author -> models "Writes the DSL and the decision records in"
        author -> build "Runs npm run build"
        author -> contrast "Runs npm run check"
        build -> contrast "Stamps the palette into each model with"
        contrast -> palette "Reads the colours and the floors from"
        build -> structurizr "Exports workspace.json and the static site with"
        structurizr -> models "Reads the DSL from"
        structurizr -> graphviz "Lays the static site out with"
        build -> exports "Writes workspace.json, the site and index.json to"
        animate -> exports "Writes trace frames into the site in"
        suggest -> exports "Reads the workspace from"
        projects -> exports "Finds every exported model in"
        delivery -> projects "Discovers models through"
        decisions -> projects "Discovers models through"
        diagramKey -> projects "Discovers models through"
        pubsub -> projects "Discovers models through"
        derived -> git "Asks which files are tracked"
        testTools -> build "Runs the planted faults of"
        serve -> viewer "Serves on localhost:8015"
        viewer -> exports "Reads index.json and the site from"
        collisions -> playwright "Renders the served site with"
        svgExport -> playwright "Renders each view with"
        reviewer -> viewer "Explores a model in, through a local server"

        # the proposal
        author -> page "Runs npm run page"
        page -> exports "Reads each model's workspace.json from"
        page -> structurizr "Exports every view as Graphviz DOT with"
        page -> graphviz "Lays each view out with"
        page -> palette "Takes the colours and the key from"
        page -> template "Fills"
        page -> modelPage "Writes one page per model as"
        testTools -> page "Runs the planted faults of"
        derived -> modelPage "Refuses a committed copy of"
        reviewer -> modelPage "Opens from anywhere, walks a trace, opens a box in"
    }

    views {
        systemContext office "SystemContext" "Who uses Drawing Office, and the four outside systems it stands on." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }
        container office "Containers" "Models, palette and exports; the tool scripts that produce and the check scripts that refuse; the viewer, and the proposed model page." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }
        component tools "ToolScripts" "Components of the tool scripts: what ships, and the page tool the proposal adds." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }
        component checks "CheckScripts" "Components of the check scripts: what ships, two of them modified by the proposal." {
            properties {
                "structurizr.tooltips" "true"
            }
            include *
            autoLayout lr 500 400
        }
        dynamic office "BuildAndCheck" "What ships: a model written, built, checked and explored in the viewer." {
            properties {
                "structurizr.tooltips" "true"
            }
            author -> models "Writes the model and its decision records"
            author -> tools "Runs npm run build"
            tools -> structurizr "Exports workspace.json and the static site"
            tools -> exports "Writes the exports and the index"
            author -> checks "Runs npm run check"
            checks -> exports "Reads every workspace.json"
            reviewer -> viewer "Opens the viewer through npm run serve"
            viewer -> exports "Reads the index and the site"
            autoLayout lr 500 400
        }
        dynamic tools "SharePage" "The proposal: a model turned into one page and sent to someone who has neither the site nor a server." {
            properties {
                "structurizr.tooltips" "true"
            }
            author -> page "Runs npm run page"
            page -> exports "Reads workspace.json"
            page -> structurizr "Exports every view as DOT"
            page -> graphviz "Lays each view out"
            page -> palette "Takes the colours and the key"
            page -> template "Fills the layout and its script"
            page -> modelPage "Writes architecture/<name>/page.html"
            reviewer -> modelPage "Opens it, plays a trace, opens a box"
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
