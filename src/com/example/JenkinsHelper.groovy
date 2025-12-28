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
}
