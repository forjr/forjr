#!/bin/sh
# Installs Forjr @VERSION@ for the person who runs it, into FORJR_HOME or ~/.forjr, with no administrator.
# Words: --build-tools also installs the build tools; --no-path leaves the start files of the shells alone.
set -eu

version='@VERSION@'
releases="${FORJR_RELEASES:-@RELEASES@}"
home="${FORJR_HOME:-$HOME/.forjr}"
tools=0
path=1
for word in "$@"; do
  case "$word" in
    --build-tools) tools=1 ;;
    --no-path) path=0 ;;
    *) echo "install.sh takes --build-tools and --no-path, and not \"$word\"." >&2; exit 2 ;;
  esac
done
if [ -z "$releases" ]; then
  echo "No address of releases ships in this script: name one with FORJR_RELEASES=<address>." >&2
  exit 2
fi
case "$releases" in */) ;; *) releases="$releases/" ;; esac

os=$(uname -s)
cpu=$(uname -m)
case "$os" in Linux) os=linux ;; Darwin) os=darwin ;; *) echo "Forjr has no release for $os." >&2; exit 2 ;; esac
case "$cpu" in x86_64|amd64) cpu=x64 ;; aarch64|arm64) cpu=arm64 ;; *) echo "Forjr has no release for $cpu." >&2; exit 2 ;; esac
system="$os-$cpu"

# The fingerprints of the archives of this version, by system and by packing: the script checks what it fetches.
print() {
  case "$1" in
@PRINTS@
    *) echo "" ;;
  esac
}

# The folder of the install is the person's own, as the launcher holds it: never a link, never one that another
# user owns, and none that others can write into, by the bits of its group whatever the group.
open_to_others() { [ -n "$(find "$1" -maxdepth 0 \( -perm -0002 -o -perm -0020 \) 2>/dev/null)" ]; }
if [ -L "$home" ]; then echo "$home is a link: Forjr installs into a folder of your own, and not through a link." >&2; exit 2; fi
if [ -e "$home" ] && [ ! -O "$home" ]; then echo "$home is not your own folder: Forjr installs into a folder you own." >&2; exit 2; fi
mkdir -p "$home"
chmod 700 "$home"
for inside in bin versions; do
  if [ -L "$home/$inside" ] || { [ -e "$home/$inside" ] && { [ ! -O "$home/$inside" ] || open_to_others "$home/$inside"; }; }; then
    echo "$home/$inside is not your own folder, or others can write into it: remove it, and install again." >&2; exit 2
  fi
done

# An archive packed with xz is taken where this computer has xz and the release holds one, and else the one with gzip.
packed() {
  if command -v xz >/dev/null 2>&1 && [ -n "$(print "$1.tar.xz")" ]; then echo xz; else echo gzip; fi
}
fetch() {
  if command -v curl >/dev/null 2>&1; then curl -fsSL -o "$2" "$1"; else wget -q -O "$2" "$1"; fi
}
sum() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d ' ' -f 1; else shasum -a 256 "$1" | cut -d ' ' -f 1; fi
}

laying="$home/versions/.$version.$$"
rm -rf "$laying"
mkdir -p "$laying"
trap 'rm -rf "$laying"' EXIT
names="forjr"
if [ "$tools" = 1 ]; then names="forjr forjr-tools"; fi
for name in $names; do
  packing=$(packed "$name-$version-$system")
  if [ "$packing" = xz ]; then ending=tar.xz; else ending=tar.gz; fi
  file="$name-$version-$system.$ending"
  wanted=$(print "$file")
  if [ -z "$wanted" ]; then echo "Forjr $version has no $file." >&2; exit 2; fi
  fetch "$releases$version/$file" "$laying/$file"
  if [ "$(sum "$laying/$file")" != "$wanted" ]; then
    printf 'error F0026\n  %s does not have the fingerprint this script holds: nothing was installed.\n' "$file" >&2; exit 2
  fi
  if [ "$packing" = xz ]; then xz -dc "$laying/$file" | tar -xf - -C "$laying"; else tar -xzf "$laying/$file" -C "$laying"; fi
  echo "$wanted" > "$laying/$name.sha256"
  rm -f "$laying/$file"
done
fetch "$releases$version/release.json" "$laying/release.json"
fetch "$releases$version/release.json.sig" "$laying/release.json.sig"

# Where the folder is already there, this is an update to this version: keys and data stay.
was=""
if [ -f "$home/current" ]; then was=$(cat "$home/current"); fi
if [ -d "$home/versions/$version" ] && [ "$tools" = 0 ] && [ -d "$home/versions/$version/tools" ]; then
  mv "$home/versions/$version/tools" "$laying/tools"
fi
rm -rf "$home/versions/$version"
mv "$laying" "$home/versions/$version"
trap - EXIT
mkdir -p "$home/bin"
cp "$home/versions/$version/player/launcher/forjr" "$home/bin/forjr.$$"
chmod 755 "$home/bin/forjr.$$"
mv "$home/bin/forjr.$$" "$home/bin/forjr"
# The keys of a fresh install are those its release brings. Over an install the keys it holds stay: a newer list
# comes by the first start, which takes it only where a key the install holds signed its release.
if [ ! -e "$home/trust.json" ]; then
  cp "$home/versions/$version/player/trust.json" "$home/trust.json.$$" 2>/dev/null && mv "$home/trust.json.$$" "$home/trust.json" || true
fi
if [ -n "$was" ] && [ "$was" != "$version" ]; then echo "$was" > "$home/previous.$$" && mv "$home/previous.$$" "$home/previous"; fi
echo "$version" > "$home/current.$$"
mv "$home/current.$$" "$home/current"

# The first thing the unpacked launcher does is check the signed release.json against what was unpacked.
if ! "$home/bin/forjr" --help >/dev/null; then
  # A refusal names its code, as every one of the player does.
  printf 'error F0026\n  What was unpacked is not what Forjr signed: it was removed. Install again from where Forjr is served.\n' >&2
  exit 2
fi

if [ "$path" = 1 ]; then
  line="export PATH=\"$home/bin:\$PATH\""
  for file in .bashrc .zshrc .profile; do
    if [ -f "$HOME/$file" ] || [ "$file" = .profile ]; then
      if ! grep -q '^# forjr$' "$HOME/$file" 2>/dev/null; then printf '# forjr\n%s\n' "$line" >> "$HOME/$file"; fi
    fi
  done
  if [ -d "$HOME/.config/fish" ]; then
    mkdir -p "$HOME/.config/fish/conf.d"
    printf '# forjr\nset -gx PATH "%s/bin" $PATH\n' "$home" > "$HOME/.config/fish/conf.d/forjr.fish"
  fi
fi
echo "Forjr $version is installed in $home. Open a new terminal, and type forjr."
