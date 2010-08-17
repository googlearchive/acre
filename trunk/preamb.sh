#!/bin/sh

files=`find . -name '*.java'`

for f in $files; do
cat <<EOF > $f
`cat preamble`

`cat $f | tail -n +2`
EOF
done

