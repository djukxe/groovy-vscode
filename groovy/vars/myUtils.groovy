def call(String message = "Hello from shared library!") {
    echo message
}

/**
 * Executes utility functions with the provided configuration map.
 *
 * @param config A map containing configuration parameters for the utility function.
 *               The specific keys and values depend on the implementation requirements.
 * @return The result of the utility function execution.
 */
def call(Map config) {
    echo "Calling with config: ${config}"
}

/**
 * Deploys the application to the specified environment.
 *
 * @param environment The target environment for deployment (e.g., 'dev', 'staging', 'prod')
 */
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
