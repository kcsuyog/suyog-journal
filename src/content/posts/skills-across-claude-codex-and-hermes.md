---
title: "Skills that travel: Claude, Codex, and Hermes"
description: "Reviewing the instructions around my agents, and separating installed workflows from proven habits."
date: "2026-09-24"
category: "Engineering"
cover: "/images/agent-skills.webp"
coverAlt: "Three illustrated toolkits exchanging reusable instruction tiles"
---

I have been looking at the skills around my development tools as part of the workflow itself. There are instructions for orchestration, code review, verification, and finishing a change. My Claude setup includes the software factory; my Hermes collection includes review, simplification, debugging, and skill-authoring workflows. Codex also has a place in my development and PR-maintenance setup.

Looking across them is more useful than asking which agent is best in the abstract. The question is whether the instructions make the next task clearer and the result easier to check.

There is an important distinction here: some of these skills are installed tooling, not workflows I authored. Having them available also does not prove I use all of them successfully. This is a review of the setup and the practices I want to keep, rather than a benchmark of the agents.

## A useful skill has an output

The strongest part of my software-factory configuration is its definition of a finished result: a bounded draft PR, independently reviewed, with verification evidence and unresolved risks called out.

That is something I can inspect. “Do a good job” gives me much less to work with.

The same principle applies to smaller skills. A review should point to the behaviour that is wrong and explain its impact. A verification step should say what ran and what it demonstrated. A handoff should identify the work that is complete and the next decision, rather than asking the next agent to reconstruct a long conversation.

I want those expectations to survive a change of tool. The command used to open a workspace may differ, but the need for a clear owner and a checkable result does not.

## Simplification deserves its own question

One interesting example in the Hermes collection is a simplification skill that separates four concerns: reuse, code quality, efficiency, and whether a fix belongs at a more appropriate level of the code.

That gives a cleanup pass a specific purpose. It can look for a helper that already exists, an unnecessary abstraction, or a repeated workaround that should be fixed once in a shared path.

The skill also distinguishes cleanup from a correctness review. I like that distinction. Code can become shorter and still be wrong. A refactor that removes duplication does not establish that permissions, errors, or edge cases behave correctly.

The tradeoff is cost. Four review passes consume attention and compute. I would rather use the focused pass that a change needs than turn every tiny edit into a ceremony.

## Port the intent, check the mechanics

A Markdown skill can look portable while depending on commands, tools, or directory conventions that exist in only one environment. That is an easy source of false confidence.

When moving a workflow between Claude, Codex, and Hermes, the parts I want to check are quite ordinary:

- Does the tool it asks for actually exist in this environment?
- Is it operating in the intended repository and branch?
- Does it distinguish permission to prepare a change from permission to publish it?
- Can the agent produce the evidence the skill asks for?

Copying the file is only the beginning. A small real task is a better test of portability than the instructions sounding sensible.

## The instructions need review too

My collection has overlapping guidance for planning, debugging, reviewing, and verification. That can be useful, but it also creates the possibility of conflicting rules or a long trail of repeated instructions.

The improvement I want is a smaller set of clear entry points, with detailed references loaded when the task needs them. A skill should explain when it applies and when it does not. It should also be possible to retire one when a tool or repository changes.

My work on the public [ShiftCare AI Skills documentation](https://github.com/shiftcare/ai-skills/pull/20) is a related example: explaining access and permissions belongs alongside explaining how to use a capability. Instructions are part of the interface.

The habit I want to carry between agents is straightforward: read the actual system, make the smallest complete change, and show enough evidence for another person to assess it. The value of the skill is in how reliably it supports that habit.
