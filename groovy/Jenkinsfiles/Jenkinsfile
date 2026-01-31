#!/usr/bin/env groovy

// Test file for Jenkins Shared Library Go to Definition
// This simulates a Jenkins pipeline using shared library functions and classes

pipeline {
    agent any

    stages {
        stage('Test Shared Library Functions') {
            steps {
                script {
                    // Test global function from vars/myUtils.groovy
                    myUtils()  // Should go to definition in vars/myUtils.groovy

                    // Test overloaded function
                    myUtils([action: "deploy", target: "prod"])  // Should go to def call(Map config)

                    // Test other functions
                    myUtils.deployTo("staging")  // Should go to deployTo function
                    myUtils.deployTo("prod", true)  // Should go to overloaded deployTo function
                }
            }
        }

        stage('Test Shared Library Classes') {
            steps {
                script {
                    // Test class from src/com/example/JenkinsHelper.groovy
                    def helper = new com.example.JenkinsHelper("my-app", "1.2.3")  // Should go to JenkinsHelper class

                    // Test static method
                    def build = com.example.JenkinsHelper.createBuild("test-build")  // Should go to createBuild method

                    // Test instance methods
                    echo helper.getProjectInfo()  // Should go to getProjectInfo method
                    helper.deploy()              // Should go to deploy method

                    // Test methods with different signatures
                    echo helper.build()          // Should NOT go to build method (no explicit return type)
                    def envs = helper.getSupportedEnvironments()  // Should go to getSupportedEnvironments method
                    def config = helper.getConfig()  // Should go to getConfig method

                    // Test static method with different signature
                    def helper2 = com.example.JenkinsHelper.createFromConfig([name: "test-app", version: "2.0.0"])  // Should go to createFromConfig method
                }
            }
        }
    }
}
