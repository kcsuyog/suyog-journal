---
title: "Being a tech lead when writing code gets faster"
description: "What my implementation work, reviews, and agent workflows are teaching me about leading delivery."
date: "2026-09-24"
category: "Leadership"
cover: "/images/suyog-waterfront.png"
coverAlt: "Suyog looking across the water from a boardwalk"
---

Looking back through my recent work, I can see two threads running together. I am still implementing features and following changes through to review. I am also reviewing other people’s code and putting more structure around how agents help with development.

That is the tension I want to get better at handling as a team lead and tech lead. I want enough contact with the code to make useful technical decisions, while leaving enough attention for the work that needs someone else to move forward.

AI makes that balance more visible. It can produce an implementation quickly. Deciding whether that implementation solves the right problem, belongs in the system, and is ready to release still requires care.

## Make the work reviewable before it becomes a diff

A useful pattern in my recent delivery work has been splitting a larger feature into pieces that each have a clear purpose and verification story.

That does not always mean the smallest possible PR. A page and the API it depends on may be easier to assess together if neither can demonstrate the intended behaviour alone. On the other hand, a large change that mixes unrelated decisions asks the reviewer to hold too much context at once.

The question I want to ask earlier is: what can another person actually verify at this boundary?

That question helps with human collaboration and agent work alike. It forces the acceptance criteria to describe a behaviour, rather than a list of files to create.

## Ask about the behaviour outside the example

One recurring theme in my own review comments is the scope of a query. Does it have a date range? Does it select only what the caller needs? What happens when it runs against much more data than the development example?

Those are not especially impressive-looking questions. They are useful because code that appears reasonable in a small example can carry a very different cost in ordinary production use.

The same thinking extends to empty states, repeated operations, and failure paths. I want a review to make an assumption visible and give the author a way to verify it. A vague request to “make this safer” leaves too much of the reasoning unstated.

I can improve here too. A terse comment may identify the issue without giving enough context. Explaining the consequence helps someone judge the tradeoff and recognise the pattern next time.

## Keep the queue small enough to understand

My software-factory setup puts a limit on concurrent implementation and on draft PRs waiting for review. I see that as a leadership decision as much as a tooling decision.

Starting more work can feel like progress. It also creates more decisions that somebody must make later. If I am that somebody, an expanding review queue is a sign to change the flow rather than simply ask the agents to run faster.

The standard I want is a steady supply of changes I can inspect properly. That includes clear ownership, a useful description, and evidence that matches the claimed behaviour.

I do not have a measured before-and-after result that proves the factory improves team throughput. The configuration expresses the approach I am trying. Review waiting time, repeated repairs, and rework after merge would be better evidence than the number of agents running.

## Be precise about what was checked

A test suite passing, a browser scenario working, and a deployment succeeding establish different things. It is tempting to compress them into “verified,” especially when an agent hands back a confident summary.

I want to keep those distinctions in the handoff. If desktop behaviour was exercised but mobile was not, say that. If the test only covers the happy path, do not let its existence imply that failure behaviour was checked.

This is one place where I want to be demanding as a lead. Honest limits give the next person somewhere to start. An overstated summary makes them repeat the investigation or trust something they should not.

## What this says about my leadership

The evidence I can point to is hands-on delivery, concrete review questions, and an effort to make agent work bounded and reviewable. That is a useful foundation. It is not a complete assessment of how I lead a team.

A fuller review would need feedback from the people I work with: whether my decisions are clear, whether reviews help them move, and whether they have room to own the solution. A GitHub history cannot answer all of that.

The next improvement I want is to make the reasoning around the work easier to share. If someone can understand the decision, finish the change, and verify it without waiting for me to reconstruct the context, that is progress I would be happy to count.
