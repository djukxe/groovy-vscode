def call(String message = "Hello from shared library!") {
    echo message
}

def call(Map config) {
    echo "Calling with config: ${config}"
}

def deployTo(String environment) {
    echo "Deploying to ${environment}"
    // Deployment logic here
}

def deployTo(String environment, boolean dryRun) {
    if (dryRun) {
        echo "DRY RUN: Would deploy to ${environment}"
    } else {
        deployTo(environment)
    }
}

notify(String channel = "#general") {
    echo "Notifying ${channel}"
    // Notification logic here
}
