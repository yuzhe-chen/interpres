#!/bin/sh
# Publishes the page that tinyurl.com/interpresapp opens: open.svg on jsDelivr, from the repository
# yuzhe-chen/saxon-arcade (folder interpres/), checked out at ~/planner/arcade.
#
# script.google.com shows Google's "Sorry, unable to open the file at this time" to visitors signed into a
# personal Gmail that does not own the script, and github.io is blocked at school. This copy works for every
# visitor: it is the live web app's own page (scripts/standalone.mjs takes it from the /exec address), served
# from jsDelivr, and it reaches the web app with plain cookie-free web requests (doPost and doGet ?result=).
#
# Run it after every Apps Script deploy, so the link gets the new page.
set -e
cd "$(dirname "$0")/.."
ARCADE="${ARCADE:-$HOME/planner/arcade}"
G="git -C $ARCADE -c user.name=yuzhe-chen -c user.email=215733212+yuzhe-chen@users.noreply.github.com"
$G pull -q --rebase
node scripts/standalone.mjs "$ARCADE/interpres/index.html"
$G add interpres/index.html interpres/open.svg
$G commit -q -m "Interpres page update" || echo "page unchanged"
$G push -q
C=$($G rev-parse HEAD)
echo "$C" > "$ARCADE/interpres/latest.txt"
$G add interpres/latest.txt
$G commit -q -m "Point the Interpres loader at $C" || true
$G push -q
for f in latest.txt open.svg; do curl -s "https://purge.jsdelivr.net/gh/yuzhe-chen/saxon-arcade@main/interpres/$f" >/dev/null; done
curl -s "https://cdn.jsdelivr.net/gh/yuzhe-chen/saxon-arcade@$C/interpres/index.html" -o /dev/null -w "warm %{http_code} %{size_download}\n"
echo "published $C"
