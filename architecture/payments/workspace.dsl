/*
 * A MESSAGE-DRIVEN ARCHITECTURE, modelled the way chapter 11 says to model one.
 *
 * It exists to be the worked example behind checks/pubsub.mjs, so it carries both shapes the chapter
 * distinguishes: a POINT-TO-POINT coupling through a queue (Figure 11-20) and a ONE-TO-MANY fan-out
 * through a topic (Figure 11-22). What it deliberately does NOT carry is a message bus container —
 * that is Figure 11-19, which the chapter's own caption calls incorrect, and the check refuses it.
 *
 * Every queue and topic is a container because chapter 11 rules that "a message queue or topic is
 * essentially a data store too". Every message label names its message rather than saying "sends
 * messages to", which is the improvement the chapter spells out. Every hop through a channel is
 * tagged Asynchronous, which architecture/theme.json renders dashed.
 */
workspace "Payments Platform" "A message-driven architecture, modelled per chapter 11 of the C4 model." {

    model {
        cardholder = person "Cardholder" "Someone paying for something."

        payments = softwareSystem "Payments Platform" "Takes payments, settles them, and tells people what happened." {

            checkout = container "Checkout service" "Takes a payment instruction and validates it." "Java and Spring Boot"

            /* THE QUEUE IS A CONTAINER, not a bus. It is named for itself, and its technology names
               the broker that happens to host it — which is why the check reads it as a channel
               rather than as the bus. */
            paymentRequests = container "Payment requested queue" "One message per payment awaiting settlement." "Amazon SQS" "Channel"

            settlement = container "Settlement service" "Moves money and records the outcome." "Java and Spring Boot"

            ledger = container "Ledger service" "The book of record for every settled payment." "Java and Spring Boot"

            /* THE TOPIC IS THE ONE-TO-MANY CASE. Two subscribers, and the chapter says the author may
               point the arrows either way to show the subscription; they point inward here. */
            statementEvents = container "Statement events topic" "One event per line added to the book of record." "Amazon SNS" "Channel"

            notifications = container "Notification service" "Tells a cardholder what happened to their money."
            auditArchive = container "Audit archive" "Keeps every statement event for seven years." "Amazon S3" "Data Store"
        }

        cardholder -> checkout "Submits a payment using"
        checkout -> paymentRequests "Sends payment requested events to" "JSON over SQS" "Asynchronous"
        paymentRequests -> settlement "Delivers payment requested events to" "JSON over SQS" "Asynchronous"
        settlement -> ledger "Records the settled payment in" "JSON over HTTPS"
        ledger -> statementEvents "Publishes statement line events to" "JSON over SNS" "Asynchronous"
        notifications -> statementEvents "Subscribes to statement line events from" "JSON over SNS" "Asynchronous"
        auditArchive -> statementEvents "Subscribes to statement line events from" "JSON over SNS" "Asynchronous"
    }

    views {
        systemContext payments "Context" "Who uses the platform." {
            include *
            autoLayout lr 500 400
        }

        container payments "Containers" "The services, and the two channels they talk through." {
            include *
            autoLayout lr 500 400
        }

        dynamic payments "Settle" "One payment, from submission to the cardholder being told." {
            cardholder -> checkout "Submits a payment"
            checkout -> paymentRequests "Sends a payment requested event"
            paymentRequests -> settlement "Delivers the payment requested event"
            settlement -> ledger "Records the settled payment"
            ledger -> statementEvents "Publishes a statement line event"
            notifications -> statementEvents "Picks up the statement line event"
            autoLayout lr 500 400
        }

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
