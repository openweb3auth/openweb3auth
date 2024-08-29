current_date=$(date +'%Y%m%d')
for pkg in packages/*; do
	if [ -f "$pkg/package.json" ]; then
		jq --arg date "$current_date" '.version = (.version | split("-" | tostring)[0] + "-" + $date)' "$pkg/package.json" > "$pkg/package.json.tmp" && mv "$pkg/package.json.tmp" "$pkg/package.json"
	fi
done
