---
allowed-tools: Bash(ls:*), Bash(find:*), Bash(grep:*), Bash(rg:*), Bash(tree:*), Bash(pnpm check:fix:*), Bash(pnpm test:*), Bash(pnpm type-check:*), Bash(pnpm test:coverage:*), Bash(pnpm test:*)
description: "Explore the codebase using the specified number of sub-agents"
---

## Instruction

Explore this codebase in parallel using the number of subagents specified in the input.

## Conditions

If no input is provided, do not use any subagents.

## Input

$ARGUMENTS
