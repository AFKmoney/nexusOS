#!/bin/bash
node --test --experimental-strip-types $(find . -name "*.test.ts")
