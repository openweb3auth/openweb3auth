current_timestamp=$(date +%s)
for pkg in packages/*; do
	if [ -f "$pkg/package.json" ]; then
		jq --arg timestamp "$current_timestamp" '.version = (.version | split("-" | tostring)[0] + "-" + $timestamp)' "$pkg/package.json" > "$pkg/package.json.tmp" && mv "$pkg/package.json.tmp" "$pkg/package.json"
	fi
done
