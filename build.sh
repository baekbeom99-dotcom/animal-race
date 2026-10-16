#!/bin/sh
# src.html(아티팩트용 본문)을 독립 실행용 index.html로 감쌉니다.
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'; cat src.html; printf '\n</body>\n</html>\n'; } > index.html
