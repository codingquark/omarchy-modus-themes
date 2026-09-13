#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-3.0-or-later
# Register both reviewed local themes. No downloads, build, or implicit switch.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
destination="$HOME/.config/omarchy/themes"
themes=(modus-operandi modus-vivendi)
cliamp_dir=${CLIAMP_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/cliamp}
hook="$HOME/.config/omarchy/hooks/theme-set.d/85-cliamp-modus"
if (( $# > 1 )) || [[ ${1:-} != '' && ${1:-} != modus-operandi && ${1:-} != modus-vivendi ]]; then
  printf 'Usage: bash install.sh [modus-operandi|modus-vivendi]\n' >&2
  exit 2
fi
for theme in "${themes[@]}"; do
  source_path="$root/themes/$theme"
  target="$destination/$theme"
  [[ -f $source_path/colors.toml ]] || { printf 'Missing built theme: %s\n' "$source_path" >&2; exit 1; }
  [[ -f $source_path/cliamp.toml ]] || { printf 'Missing Cliamp theme: %s\n' "$source_path" >&2; exit 1; }
  if [[ -e $target || -L $target ]]; then
    if [[ ! -L $target || $(readlink -f -- "$target") != "$source_path" ]]; then
      printf 'Refusing to replace existing theme: %s\nMove it aside before installing this package.\n' "$target" >&2
      exit 1
    fi
  fi
done
for theme in "${themes[@]}"; do
  target="$cliamp_dir/themes/$theme.toml"
  if [[ -e $target || -L $target ]]; then
    if [[ ! -L $target || $(readlink -f -- "$target") != "$root/themes/$theme/cliamp.toml" ]]; then
      printf 'Refusing to replace existing Cliamp theme: %s\n' "$target" >&2
      exit 1
    fi
  fi
done
if [[ -e $hook || -L $hook ]]; then
  if [[ ! -L $hook || $(readlink -f -- "$hook") != "$root/hooks/85-cliamp-modus" ]]; then
    printf 'Refusing to replace existing hook: %s\n' "$hook" >&2
    exit 1
  fi
fi
mkdir -p -- "$destination"
for theme in "${themes[@]}"; do
  target="$destination/$theme"
  [[ -L $target ]] || ln -s -- "$root/themes/$theme" "$target"
  printf 'Registered %s\n' "$theme"
done
mkdir -p -- "$cliamp_dir/themes" "$(dirname -- "$hook")"
for theme in "${themes[@]}"; do
  target="$cliamp_dir/themes/$theme.toml"
  [[ -L $target ]] || ln -s -- "$root/themes/$theme/cliamp.toml" "$target"
done
[[ -L $hook ]] || ln -s -- "$root/hooks/85-cliamp-modus" "$hook"
if [[ -n ${1:-} ]]; then
  omarchy theme set "$1"
else
  current_file="$HOME/.local/state/omarchy/current/theme.name"
  if [[ -f $current_file ]]; then
    bash "$hook" "$(cat "$current_file")"
  fi
  printf 'Current theme unchanged. Select either Modus theme in the Omarchy picker.\n'
fi
