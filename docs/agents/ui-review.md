# Changing what's on screen

How a change to a screen, its words, its icons or the office is made and handed over. **The demo and
capture scripts don't exist yet;** this is the plan they will follow. Two ideas run through it:
**user-centred design** (the CEO in the real window is the judge, not the code or the diff) and
**show, don't tell** (a picture or a clip before a sentence). The rules are in
`docs/design-system.md` and `docs/office.md`.

1. **Look at the real window first**, on the made-up demo Office, light and dark, both languages.
   Done when you have seen every screen the change touches.
2. **Make the change** by the design system. A shared part (a card, a badge, a Peep animation) changes
   every place that uses it: list them before editing.
3. **Check it in pictures.** Capture the same states after, and compare each with its before. For the
   office, record a short clip of the Activity or Drop you changed.
4. **Measure, then say it.** A number told to the maintainer (frame rate, tokens per session, words on
   a screen) comes from a real run, with how it was measured.
5. **Ask with pictures.** A choice the maintainer makes (a label, a default, an animation) comes with a
   picture or clip of each option, your pick marked and said why.
