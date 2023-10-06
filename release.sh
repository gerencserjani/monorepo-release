#!/bin/bash

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new_version>"
  exit 1
fi

new_version="$1"

latest_tag=$(git describe --tags --abbrev=0 --match "cms-gateway-v*.*.*")

affected_apps=$(nx print-affected --select=projects --type=app --base=$latest_tag)

for app in $affected_apps; do
  app_name="${app%,}"
  npm --prefix ./apps/$app_name version $new_version
  git tag "$app_name-v$new_version"
  git commit -am "chore($app_name): Updated $app_name to version $new_version"
done

npm version $new_version --no-git-tag-version
git tag "cms-gateway-v$new_version"
git commit -am "chore(cms-gateway): Updated cms-gateway to version $new_version"