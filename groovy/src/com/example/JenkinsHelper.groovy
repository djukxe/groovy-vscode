package com.example

class JenkinsHelper {
    private String projectName
    private String version

    JenkinsHelper(String projectName, String version = "1.0.0") {
        this.projectName = projectName
        this.version = version
    }

    def getProjectInfo() {
        return "${projectName} v${version}"
    }

    static def createBuild(String name) {
        return new JenkinsHelper(name, "SNAPSHOT")
    }

    def deploy() {
        echo "Deploying ${projectName}"
        return true
    }

    // Method with different signature - no explicit return type
    build() {
        return "Building ${projectName}"
    }

    // Method with complex return type
    List<String> getSupportedEnvironments() {
        return ["dev", "staging", "prod"]
    }

    // Method with generic return type
    Map<String, Object> getConfig() {
        return [name: projectName, version: version]
    }

    // Static method with different signature
    static createFromConfig(Map config) {
        return new JenkinsHelper(config.name, config.version ?: "1.0.0")
    }
}
