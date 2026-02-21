#!/usr/bin/env bash
MSG_FILE=$1
MSG=$(cat "$MSG_FILE")

if ! echo "$MSG" | grep -Eq "^(feat|fix)(\([^)]+\))?: |^chore\(release\): "; then
  echo "ERROR: Commit message must start with 'feat:', 'fix:' or 'chore(release):'"
  echo "Only features and bug fixes are allowed to trigger a release."
  echo "Current message:"
  echo "$MSG"
  exit 1
fi
exit 0
