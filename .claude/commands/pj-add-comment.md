---
allowed-tools: Bash(ls:*), Bash(find:*), Bash(grep:*), Bash(rg:*), Bash(tree:*)
description: "Adds documentation and comments to the provided code arguments"
---

## Instructions

Based on the current implementation, please add JSDoc and comments to the input file.
If no updates are necessary, simply exit.

## Guidelines

- JSDoc
  - **Classes**: Add JSDoc for the class itself with purpose and usage examples where complex.
  - **Public methods only**: Add JSDoc for all public methods (no private/protected methods).
  - **Interfaces and types**: Add JSDoc for interfaces, types, and their properties.
  - **Exported functions**: Add JSDoc for any functions that are called externally.
  - **Do not include sample code** in JSDoc except at the class level when the class has complex usage patterns.
  - **Accuracy**: If existing JSDoc does not match the actual implementation, correct it.
  - **Clarity**: Improve any unclear or outdated JSDoc comments.
  - **Design rationale**: Explain architectural decisions or design patterns used in the class.
- Comments
  - **Complex logic only**: Add inline comments for code that implements non-obvious algorithms or
    business rules.
  - **Why, not what**: Focus on explaining the reasoning behind the implementation, not what the code
    does.
  - **External dependencies**: Explain any quirks or workarounds related to external APIs or libraries.
  - **Avoid obvious comments**: Do not add comments for self-explanatory code.

## Input

$ARGUMENTS
