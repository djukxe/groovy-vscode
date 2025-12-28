package com.example.test

/**
 * Test file to demonstrate Go to Definition feature
 * 
 * Try the following:
 * 1. Cmd+Click (or Ctrl+Click) on "Person" in line 38 to jump to the class definition (line 9)
 * 2. Click on "greet" in line 39 and press F12 to jump to method definition (line 22)
 * 3. Right-click on "name" in line 24 and select "Go to Definition" (jumps to line 12)
 */
class Person {
    // Property definitions - Go to Definition should work on these
    private String name
    private int age
    
    // Constructor - you can jump to parameter definitions
    Person(String name, int age) {
        this.name = name
        this.age = age
    }
    
    // Method definition
    def greet() {
        return "Hello, my name is ${name} and I am ${age} years old"
    }
    
    // Method with local variables
    def celebrateBirthday() {
        def oldAge = age  // Try jumping to 'age' definition
        age++
        def message = "Happy birthday! You are now ${age}"  // Try jumping to 'message' definition
        println message
        return oldAge
    }
}

class Application {
    static void main(String[] args) {
        // Try Go to Definition on 'Person' here (should jump to line 9)
        def person = new Person("Alice", 30)
        println person.greet()  // Try jumping to 'greet' method
        
        // Local variable
        def result = person.celebrateBirthday()
        println "Previous age was: ${result}"
        
        // Try jumping to these variable definitions
        def numbers = [1, 2, 3, 4, 5]
        def doubled = numbers.collect { it * 2 }
        
        // Method call with local variable
        processData(doubled)
    }
    
    // Static method
    static def processData(List data) {
        data.each { item ->  // Try jumping to 'data' parameter
            println "Processing: ${item}"
        }
    }
}

// Interface definition
interface Greeter {
    String greet()
}

// Class implementing interface
class FormalGreeter implements Greeter {
    private String title
    private String name
    
    FormalGreeter(String title, String name) {
        this.title = title
        this.name = name
    }
    
    @Override
    String greet() {
        return "Good day, I am ${title} ${name}"
    }
}

// Trait definition
trait Logger {
    void log(String message) {
        println "[${new Date()}] ${message}"
    }
}

// Using the trait
class Service implements Logger {
    def execute() {
        log("Service starting...")  // Try jumping to 'log' method in trait
        def status = "running"
        log("Service status: ${status}")
        return status
    }
}
