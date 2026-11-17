---
name: review
description: Review a Peep's finished work against the Brief and the Task before it reaches the CEO. Use when a Task moves to Review, or the CEO asks the Manager to check someone's work.
---

A review ends in one verdict: **Pass** or **Changes**. It works for any kind of output: a script, a
video edit, a landing page, code, a spreadsheet.

## Steps

1. **Gather.** Read the Task, its "done when", the Peep's Handoff Note, and `docs/brief.md`. Open
   every file the Handoff Note names; a review of work you haven't opened is no review.
2. **Delegate code.** When the output is code, run `ponytail-review` on it and fold its findings into
   step 3.
3. **Check** each point and note what fails, with the file and the place in it:
   - **Done:** every part of the Task's "done when" is there.
   - **Brief:** it follows the Brief's principles and stays inside "What the first version does".
   - **Works:** it opens, plays, builds or reads correctly; you tried it where you could.
   - **Words:** names and terms match `CONTEXT.md`.
   - **Safe:** no secrets, no personal data, nothing published or sent that the CEO didn't approve.
4. **Verdict.** Done when you have written one of:
   - **Pass**, with one line on what is good enough and why.
   - **Changes**, with a numbered list, most important first, each one a concrete fix a Peep can do
     without asking you anything.

The app sends a **Changes** Task back once, with your list, on the Role's stronger model (an
Escalation). After a second **Changes** it goes to the CEO.
