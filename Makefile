UUID='wallapocket@inbalboa.github.io'
TAG=`jq '.version' metadata.json`

check:
	@printf "==> checking the working tree... "
	@sh -c 'if [ -z "`git status --porcelain=v1`" ]; then printf "clean\n"; else printf "working tree is dirty, please, commit changes\n" && false; fi'

tag:
	@printf "==> tagging...\n"
	@git tag -a "v$(TAG)" -m "Release $(TAG)"

pub:
	@printf "==> pushing...\n"
	@git push --atomic origin main "v$(TAG)"

install: package
	@printf "==> installing locally...\n"
	@glib-compile-schemas schemas
	@gnome-extensions install --force $(UUID).shell-extension.zip
	@printf "Restart Gnome Shell session\n"

uninstall:
	@printf "==> uninstalling...\n"
	@gnome-extensions uninstall $(UUID)

reinstall: uninstall install
	@printf "==> reinstalling locally...\n"

package:
	@printf "==> packaging...\n"
	@gnome-extensions pack --force \
	--extra-source="LICENSE.md" \
	--extra-source="wallabagApi.js" \
	--extra-source="deleteConfirmation.js" \
	--extra-source="quickSave.js" \
	--extra-source="item.js"

release: check tag pub
	@printf "\nPublished at %s\n\n" "`date`"

.DEFAULT_GOAL := package
.PHONY: check tag pub install uninstall reinstall package release
