package com.example

/**
 * Helper class for Jenkins-related operations.
 * 
 * This class provides utility methods and functionality for interacting with
 * Jenkins CI/CD systems, managing builds, jobs, and related configurations.
 */
class JenkinsHelper {
    private String projectName
    private String version

    /**
     * Constructs a JenkinsHelper instance for managing Jenkins operations.
     *
     * @param projectName the name of the Jenkins project
     * @param version the version of the project (defaults to "1.0.0")
     */
    JenkinsHelper(String projectName, String version = "1.0.0") {
        this.projectName = projectName
        this.version = version
    }

    def getProjectInfo() {
        return "${projectName} v${version}"
    }

    /**
     * Creates a build with the specified name.
     *
     * @param name the name of the build to create
     * @return the created build object
     */
    static def createBuild(String name) {
        return new JenkinsHelper(name, "SNAPSHOT")
    }

    def deploy() {
        echo "Deploying ${projectName}"
        return true
    }

    /**
     * Retrieves the list of supported environments.
     *
     * @return a List of String containing the names of all supported environments
     */
    List<String> getSupportedEnvironments() {
        return ["dev", "staging", "prod"]
    }

    // Method with generic return type
    Map<String, Object> getConfig() {
        return [name: projectName, version: version]
    }

    /**
     * Creates a JenkinsHelper instance from a configuration map.
     *
     * @param config A map containing configuration parameters for the JenkinsHelper
     * @return A new JenkinsHelper instance configured with the provided settings
     */
    static createFromConfig(Map config) {
        return new JenkinsHelper(config.name, config.version ?: "1.0.0")
    }

}
