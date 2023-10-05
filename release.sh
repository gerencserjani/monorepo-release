#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new_version>"
  exit 1
fi

new_version="$1"

affected_apps=$(nx print-affected --select=projects --type=app)

for app in $affected_apps; do
  npm --prefix ./apps/$app version $new_version
  git tag "$app-v$new_version"
done

commit_message="Updated $affected_apps to version $new_version and tagged individually."

git commit -am "$commit_message"

echo $commit_message