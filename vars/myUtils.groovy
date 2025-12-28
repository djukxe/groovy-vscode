def call(String message = "Hello from shared library!") {
    echo message
}

def deployTo(String environment) {
    echo "Deploying to ${environment}"
    // Deployment logic here
}

def notify(String channel = "#general") {
    echo "Notifying ${channel}"
    // Notification logic here
}
