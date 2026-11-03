# 동물 달리기 추첨

초등학교 교실에서 추첨할 때 쓰는 웹앱입니다. 다음(Daum) 키즈짱의 '동물달리기(순서 정하기 게임)'를 참고해 만들었습니다.

- **동물 달리기**: 이름을 넣으면 동물들이 세로 트랙을 달립니다. 돌발 상황(꽈당·쿨쿨·부스터)과 막판 역전, 슬로모션이 있습니다. 출발부터 결과까지 20초(빠르게 ×2면 10초)입니다.
- **마블 룰렛**: 이름표 붙은 구슬이 물리 엔진으로 코스(핀볼 숲·풍차 언덕·미끄럼틀·통통 범퍼)를 굴러 내려가고, 결승 앞 플리퍼와 범퍼가 순위를 뒤집습니다.

`index.html`, `characters.js`, `pokemon.js`, `pokemon-data.js`가 같은 폴더에 있으면 동작하며 설치가 필요 없습니다. 두 파일은 같은 폴더에 둬야 합니다. 인터넷이 없으면 글꼴만 기본 글꼴로 바뀝니다.

## 포켓몬 모드

동물 달리기 탭 오른쪽 위 **포켓몬 모드 ON/OFF** 버튼으로 켭니다. 1세대 진화 1단계 포켓몬 30종 가운데 참가자 수만큼 무작위로 뽑혀 달리고, 경주 중 진화합니다(진화 시간을 포함한 평균 속도는 모두 같음).

- 스프라이트: [PMD Sprite Repository (SpriteCollab)](https://sprites.pmdcollab.org/), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). 제작자 목록은 화면 하단 '제작자 보기'에 있습니다.
- `pokemon-data.js` 만들기:
  1. `python tools/build_pokemon.py <SpriteCollab 폴더> 1 73` (원본 스프라이트 묶기)
  2. `node tools/upscale_pokemon.js` (아래쪽 방향 줄만 남기고 2xBR로 2배 해상도)
  3. 데이터를 새로 만들면 `pokemon.js`의 `DATA_VERSION`(과 `src.html`의 `pokemon.js?v=`)을 바꿔 브라우저 캐시를 피합니다.
- `tools/upscale-compare.html`: 확대 방법(원본·Scale2x·MMPX·2xBR) 비교용 페이지. 원본 데이터(1단계만 한 상태)에서 열어야 제대로 비교됩니다.

## 수정 방법

- 캐릭터 모양과 색(동물 12종, 번호 풍선, 구슬)은 `characters.js`에 있습니다. 고친 뒤 바로 새로고침하면 됩니다.
- 그 밖의 화면과 게임 진행은 `src.html`에 있습니다. 고친 뒤 `sh build.sh`를 실행하면 `index.html`이 다시 만들어집니다.
