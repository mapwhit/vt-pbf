check: lint test

lint:
	./node_modules/.bin/standard index.js test/*.js bench/index.js

test:
	node --test

bench:
	node bench

.PHONY: check lint test bench
