package com.example

/**
 * Example Groovy class demonstrating language features
 */
class HelloWorld {
    // Static property
    static final String GREETING = "Hello"
    
    // Instance property
    private String name
    
    // Constructor
    HelloWorld(String name) {
        this.name = name
    }
    
    // Static method
    static void main(String[] args) {
        def world = new HelloWorld("World")
        println world.greet()
        
        // Groovy closures
        def numbers = [1, 2, 3, 4, 5]
        def doubled = numbers.collect { it * 2 }
        println "Doubled: ${doubled}"
        
        // String interpolation
        def message = "Numbers: ${numbers.join(', ')}"
        println message
    }
    
    // Instance method with dynamic typing
    def greet() {
        return "${GREETING}, ${name}!"
    }
    
    // Method with explicit return type
    String getFormattedName() {
        return name.toUpperCase()
    }
}

// Trait definition (Groovy feature)
trait Loggable {
    void log(String message) {
        println "[LOG] ${message}"
    }
}

// Class using trait
class LoggableService implements Loggable {
    def processData() {
        log("Processing data...")
        // Process logic here
        log("Data processed successfully")
    }
}
