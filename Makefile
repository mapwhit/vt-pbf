check: lint test

lint:
	./node_modules/.bin/eslint index.js test/*.js bench/index.js

test:
	./node_modules/.bin/tape test/*.js

bench:
	node bench

.PHONY: check lint test bench
