---
title: "OpenRouter, OpenCode, Hermes, Claude, and Codex in one Orca workspace"
description: "How I bring different agents into Orca, use OpenRouter through OpenCode and Hermes, and keep parallel work reviewable."
date: "2026-10-04"
category: "Engineering"
cover: "/images/orca-software-factory.webp"
coverAlt: "Orca showing parallel workspaces, an agent conversation, and pull request review checks"
---

My development setup now brings OpenCode and Hermes into the same Orca environment as Claude Code and Codex. OpenRouter gives me another way to choose models through OpenCode and Hermes, while Orca gives the work somewhere to live.

What interests me is having several useful approaches available at the same time. I can leave an investigation running, work on a bounded implementation, and ask another agent to review a finished change. The challenge is keeping each session's purpose clear enough that I can still understand the result.

This builds on [my earlier post about parallel work with Orca](/parallel-work-with-orca/). The worktree boundaries still matter. Adding more agents makes those boundaries more valuable.

## The workspace, the agent, and the model

There are three choices in this setup: where the work happens, which agent runs it, and which model that agent uses.

Orca is where I organise the workspaces and terminals. OpenCode, Hermes, Claude Code, and Codex are the agents I bring into that environment. OpenRouter supplies model access for the OpenCode and Hermes sessions configured to use it.

OpenCode supports OpenRouter as a provider. Its terminal workflow lets me connect an API key and choose a model using `/connect` and `/models`. [OpenRouter's OpenCode guide](https://openrouter.ai/docs/cookbook/coding-agents/opencode-integration) documents that setup.

Hermes also supports OpenRouter. Its documentation describes configuring `OPENROUTER_API_KEY` in `~/.hermes/.env` and choosing the provider and model interactively with `hermes model`. [Hermes provider documentation](https://hermes-agent.nousresearch.com/docs/integrations/providers) covers those options.

Choosing a Claude model through OpenRouter is a different configuration from opening a Claude Code session. In this workflow, Claude Code and Codex keep their own configured authentication; connecting OpenRouter in OpenCode or Hermes does not change those other sessions.

## Connecting OpenCode and Hermes

With OpenCode already installed, I open a terminal in the intended worktree and start it:

```sh
opencode
```

Inside OpenCode, the setup is:

```text
/connect
```

I select OpenRouter and enter the key when prompted, then choose a model:

```text
/models
```

These are OpenCode commands, rather than shell commands. The [OpenCode provider documentation](https://opencode.ai/docs/providers) explains provider configuration in more detail.

For Hermes, I put the OpenRouter key in its local environment file:

```dotenv
# ~/.hermes/.env — local configuration, outside the repository
OPENROUTER_API_KEY=your-openrouter-key
```

Then I use its interactive selector:

```sh
hermes model
```

I choose OpenRouter and the model I want for that session. I keep the real key out of committed files and handoff notes. The commands above are a setup outline; the actual model choice belongs to the task and the installed tool's available options.

## Running together needs separate ownership

Having four agents available does not mean giving all four permission to edit the same checkout. Each implementation needs an owner and a worktree. A review needs an exact branch or commit to inspect.

Here is an example of how I would divide a batch of work. These roles are task assignments, rather than claims about which agent is universally best:

| Session | Assignment | Expected result |
| --- | --- | --- |
| Claude Code | Trace an unfamiliar behaviour | Relevant code paths and a bounded implementation plan |
| Codex | Implement the agreed change in its worktree | A diff with verification evidence |
| OpenCode via OpenRouter | Work on an independent task in another worktree | A separate change ready for review |
| Hermes via OpenRouter | Review a specified commit without editing it | Concrete findings and the checks still needed |

The sessions can overlap when their work is independent. A review of an implementation starts once there is a stable change to review. If the OpenCode task depends on an interface Codex is still changing, I need to settle that interface before pretending both tasks can proceed freely.

## A handoff should survive a change of agent

A conversation in one terminal is not automatically context in another. I want the next agent to have enough information to begin without reconstructing the whole discussion.

A useful handoff looks like this:

```text
Task: Review the change at the supplied commit.
Repository and worktree: [exact path]
Branch and commit: [exact identifiers]
Expected behaviour: [observable acceptance criteria]
Scope: Read-only review; do not modify the implementation.
Verification: [commands run, results, and remaining gaps]
Output: Findings with file locations, impact, and reproduction steps.
```

The same structure works when moving from Claude Code to Codex, or from an OpenCode implementation to a Hermes review. I can change the agent while keeping the task's contract clear.

## More choice still needs a review budget

OpenRouter makes it convenient to try different models through these agents. I still need to consider how much context I send, how often I repeat the same investigation, and how many finished changes I can review.

I am not claiming a speed improvement or a cost saving from this setup. Those need measurement. The things I want to track are repair rounds, time waiting for review, total usage per completed task, and whether the final change is easier to assess.

For now, the useful pattern is straightforward: choose an agent and model for a specific job, give that job a clear workspace boundary, and bring back a result I can inspect. Orca keeps the sessions close together. Clear ownership and verification are what make working with them together manageable.
