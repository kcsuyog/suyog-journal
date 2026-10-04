---
title: "My personal brain and software factory: Hermes, Claude Code, Codex, and OpenCode"
description: "Hermes for personal thinking, Claude Code and Codex checking each other's technical work, and OpenCode through OpenRouter when I hit usage limits."
date: "2026-10-04"
category: "Engineering"
cover: "/images/orca-software-factory.webp"
coverAlt: "Orca showing parallel workspaces, an agent conversation, and pull request review checks"
---

I use several agents around Orca, but each has a different place in my workflow. Hermes is my personal brain. My technical work starts between Claude Code and Codex, with the two checking each other's work through my software factory. OpenCode is mostly the fallback I turn to when I run out of limits.

OpenRouter gives me model access through OpenCode and Hermes. Orca is where I keep the technical workspaces and sessions together. The useful part of this setup is knowing which tool I want to reach for, and what I expect it to bring back.

## Hermes is my personal brain

The role I give Hermes is personal thinking and context. It is where I turn when I want help making sense of what is on my mind, before that becomes a specific engineering task.

That is a different responsibility from implementing a change or checking a pull request. In my setup, the technical implementation and cross-review loop belongs mainly to Claude Code and Codex.

I like having room for thinking before I enter that loop. A thought does not need to become a coding task immediately. When it does become one, it needs a clear problem, enough context, and an outcome I can check.

## Claude Code and Codex do the technical work

I start my technical work between Claude Code and Codex. I do not assign implementation permanently to one and review permanently to the other. The useful pattern is that whichever agent does the work, the other can challenge it.

In the software factory, that means moving from a bounded problem to an implementation, giving the change to the other agent for verification, and repairing concrete findings before bringing it back for review.

A Claude Code implementation can go to Codex for a fresh look. A Codex implementation can go to Claude Code. I want the reviewer to inspect the actual change and expected behaviour, rather than simply agree with the implementer's explanation.

The questions I care about are practical:

- Does the change solve the original problem?
- Did it reuse the relevant code and follow the repository's conventions?
- What happens on failure paths and edge cases?
- Do the checks demonstrate the behaviour being claimed?

Two agents agreeing does not settle those questions. I still need the diff, the checks, and enough evidence to judge the result myself.

This is the workflow I described in [my post about building a software factory with Orca](/parallel-work-with-orca/). The review loop matters as much as the initial implementation.

## OpenCode is my fallback when I hit limits

When I run out of usage limits, I mostly turn to OpenCode through OpenRouter. The models I mostly use there are DeepSeek 4.2 Flash and GLM 5.3 Flash.

I am not much of a fan of those models for complex coding work. In my experience, they are mostly useful for small, bounded changes. I am more comfortable giving them a focused edit with clear acceptance criteria than handing them a complicated problem that needs reasoning across a large system.

That is my assessment from using them, rather than a benchmark or a claim about every task they can handle. It affects the scope I give them. A fallback can keep a small piece of work moving without becoming my first choice for the hardest parts of a project.

When a task is complex, I would rather keep it in the Claude Code and Codex workflow once capacity is available. Running into a limit is a reason to reconsider the next task, not to assume every model is interchangeable.

## OpenRouter connects the model choice

OpenRouter sits underneath the OpenCode and Hermes sessions configured to use it. It gives me another place to choose models while keeping the agent's workflow separate from that choice.

For an installed OpenCode terminal session, the connection flow uses `/connect`: choose OpenRouter and enter the API key when prompted. Then `/models` opens the model selection. These are commands inside OpenCode. [OpenRouter's OpenCode guide](https://openrouter.ai/docs/cookbook/coding-agents/opencode-integration) documents the setup.

Hermes supports an OpenRouter key in its local `~/.hermes/.env` file and an interactive provider and model selector through `hermes model`. [The Hermes provider documentation](https://hermes-agent.nousresearch.com/docs/integrations/providers) covers those options. Real credentials stay outside the repository.

Those connections do not change how I authenticate my separate Claude Code and Codex sessions. The agent, the model, and the workspace each have their own role.

## Orca keeps the technical sessions together

Having the tools available at the same time is useful when each session has a clear responsibility. Here is how I think about their places in my workflow:

| Tool | My main use |
| --- | --- |
| Hermes | My personal brain: thinking and context |
| Claude Code | Technical implementation and verification of Codex's work |
| Codex | Technical implementation and verification of Claude Code's work |
| OpenCode via OpenRouter | Mostly small coding tasks when I run out of limits |
| Orca | Organising technical workspaces, terminals, and review context |

Separate implementation tasks need separate worktrees and clear ownership. For a cross-review, I want a stable commit, the original acceptance criteria, and a record of what was tested. The reviewer should know which change it is judging and whether it has permission to edit it.

That keeps parallel sessions understandable. Hermes helps me think. Claude Code and Codex carry the main technical work and check each other. OpenCode gives me a fallback for smaller work. Orca gives the technical activity a place to live, while I stay responsible for deciding whether the result is ready.
