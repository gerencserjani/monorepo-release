#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new_version>"
  exit 1
fi

new_version="$1"

latest_tag=$(git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*")
latest_tag_hash=$(git rev-list -n 1 $latest_tag)

affected_apps=$(nx print-affected --select=projects --type=app --base=$latest_tag --head=HEAD)

for app in $affected_apps; do
  app_name="${app%,}"
  npm --prefix ./apps/$app_name version $new_version
  git tag "$app_name-v$new_version"
done

npm version $new_version --no-git-tag-version
git tag "cms-gateway-v$new_version"

commit_message="Updated $affected_apps and GATEWAY to version $new_version and tagged individually."

git commit -am "$commit_message"

echo $commit_message