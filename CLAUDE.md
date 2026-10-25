# Interpres

A Latin site: conjugation and declension tables, and a dictionary beside the
Cambridge course stages. Plain ES modules served from `public/`, a small Node
server in `server/`. No build step.

The translator was removed to be redesigned from the ground up; the old one is
at the tag `last-translator`.

## Before you start

**Read [LESSONS.md](LESSONS.md).** It records mistakes made on this project and
the rule each one produced. Most of them cost real work. Add to it when
something goes wrong.

The ones that have cost the most, in short:

- Never put a destructive command behind `||`. `git checkout <path>` on an
  uncommitted file is deletion.
- `logs/` is gitignored and is *not* scratch. It is collected data.
- Measure before claiming an improvement. A cherry-picked example is not
  evidence; build the sweep first.
- Work out what a loop costs before running it. The free model tier is 200,000
  tokens a day and one careless corpus run spends all of it.
- Fix the root cause. Four patches around one bad ranking rule moved the score
  by zero.

## Testing

- `npm test` is the offline suite and must stay offline.

## Deploying

- After every Apps Script deploy, run `sh scripts/publish-jsdelivr.sh`. It
  republishes tinyurl.com/interpresapp, the link that works for visitors
  signed into a personal Gmail (see README, Deploying).
