---
title: "Parallel work with Orca: building my software factory"
description: "Separate workspaces, clear handoffs, and a review queue I can actually keep up with."
date: "2026-09-24"
category: "Engineering"
cover: "/images/orca-software-factory.webp"
coverAlt: "Illustrated parallel conveyor tracks bringing code modules to a shared inspection desk"
---

My development workspace has become a collection of different kinds of work. There are investigations, implementation tasks, code reviews, and pull requests that need attention after the initial coding is finished. Some are running through Claude Code, others through Codex. Orca is where I keep those workspaces together.

That arrangement makes parallel work possible. It also raises a question I keep coming back to: how much work can I start before I lose the ability to judge it properly?

Opening another agent is easy. Keeping its task independent, checking its result, and fitting the change into the rest of the system takes more thought.

## Give each task somewhere to live

The part of Orca I find useful here is the worktree model. A task can have its own checkout and terminals, with its branch and review context close by. I can leave one investigation in progress without folding its uncommitted changes into another piece of work.

That separation matters when agents are involved. Two agents working on unrelated changes should not quietly share a working directory. An implementer should know which branch it owns. A reviewer should be able to inspect the exact change it is being asked to judge.

A separate worktree does not make tasks independent, though. If two changes depend on the same unfinished interface, putting them in different folders only moves the conflict to integration time. I still need to understand the dependency before deciding what can run together.

## The factory ends at a reviewable change

I have a software-factory skill configured around a simple sequence:

1. Analyse the problem and trace the existing behaviour.
2. Implement a bounded change with acceptance checks.
3. Give the result to a fresh reviewer.
4. Repair concrete findings, then review again.
5. Return a draft pull request with the evidence and remaining risks.

The coordinator holds the scope and routes the work. The implementer changes the code. The reviewer reads the diff and challenges the result. Keeping those responsibilities separate gives me a better chance of catching assumptions that the implementation conversation has already become attached to.

A fresh reviewer is still fallible. Using another provider can offer a different perspective, but two agents agreeing is not proof. The diff, the behaviour, and the checks still have to support the conclusion.

The factory’s configured endpoint is deliberately a draft PR. It does not merge or deploy. That leaves me with a concrete change to assess, including what was tested and what could not be verified.

## Parallelism needs a limit

My factory configuration caps active implementations and draft PRs awaiting review at two each. That is a working constraint, not a claim that two is the ideal number for every team.

The reasoning is practical. Every extra implementation can create more review, integration, and follow-up work. If I generate changes faster than I can understand them, I have only moved the queue.

I also want parallel reviews to have distinct questions. One pass can look for existing code we should reuse; another can examine failure behaviour. Sending several agents the same vague instruction risks producing several versions of the same shallow review.

## What I still need to measure

The skill describes how I want the workflow to run. Its presence on disk does not establish that every task has followed it or that it has improved delivery speed.

The measurements I care about next are time waiting for review, repair rounds, how often a change has to be reopened, and whether a finished PR is easier for another person to understand. Counting terminals or generated lines would miss most of that.

So far, the useful change in my own thinking is the unit of work. I want to hand over a problem with a boundary and an observable result. Orca gives that work a place to live. The engineering judgment is still in choosing the boundary, checking the evidence, and knowing when another parallel task would be one too many.
