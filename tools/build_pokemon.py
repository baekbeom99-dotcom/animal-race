"""SpriteCollab(PMD Sprite Repository) 스프라이트로 포켓몬 모드 데이터(pokemon-data.js)를 만듭니다.

사용법:  python tools/build_pokemon.py <SpriteCollab 폴더> [시작번호] [끝번호]
예:      python tools/build_pokemon.py C:/claude_code/poke/SpriteCollab 1 73
        (1세대 0001~0073 = 진화 1단계 30종과 그 진화형)

파이썬 기본 기능만 씁니다. 스프라이트 시트는 통째로 넣고, 아래쪽(보는 사람 쪽) 방향 줄을
잘라 쓰는 일과 발 위치 계산은 브라우저(pokemon.js)에서 합니다.
"""
import base64, json, os, struct, sys
import xml.etree.ElementTree as ET

# 경주에 쓰는 동작. 없으면 pokemon.js가 대체 동작을 씀
ANIMS = ["Walk", "Idle", "Sleep", "Hurt", "Trip", "Pose", "Hop", "Charge"]

# 0001~0073 한글 이름과 진화 (다음 단계 번호). 진화 1단계 30종:
# 이상해씨 파이리 꼬부기 캐터피 뿔충이 구구 꼬렛 깨비참 아보 피카츄 모래두지 니드런♀ 니드런♂ 삐삐 식스테일
# 푸린 주뱃 뚜벅쵸 파라스 콘팡 디그다 나옹 고라파덕 망키 가디 발챙이 캐이시 알통몬 모다피 왕눈해
KO = {
    1: "이상해씨", 2: "이상해풀", 3: "이상해꽃", 4: "파이리", 5: "리자드", 6: "리자몽",
    7: "꼬부기", 8: "어니부기", 9: "거북왕", 10: "캐터피", 11: "단데기", 12: "버터플",
    13: "뿔충이", 14: "딱충이", 15: "독침붕", 16: "구구", 17: "피죤", 18: "피죤투",
    19: "꼬렛", 20: "레트라", 21: "깨비참", 22: "깨비드릴조", 23: "아보", 24: "아보크",
    25: "피카츄", 26: "라이츄", 27: "모래두지", 28: "고지", 29: "니드런♀", 30: "니드리나",
    31: "니드퀸", 32: "니드런♂", 33: "니드리노", 34: "니드킹", 35: "삐삐", 36: "픽시",
    37: "식스테일", 38: "나인테일", 39: "푸린", 40: "푸크린", 41: "주뱃", 42: "골뱃",
    43: "뚜벅쵸", 44: "냄새꼬", 45: "라플레시아", 46: "파라스", 47: "파라섹트", 48: "콘팡",
    49: "도나리", 50: "디그다", 51: "닥트리오", 52: "나옹", 53: "페르시온", 54: "고라파덕",
    55: "골덕", 56: "망키", 57: "성원숭", 58: "가디", 59: "윈디", 60: "발챙이",
    61: "슈륙챙이", 62: "강챙이", 63: "캐이시", 64: "윤겔라", 65: "후딘", 66: "알통몬",
    67: "근육몬", 68: "괴력몬", 69: "모다피", 70: "우츠동", 71: "우츠보트", 72: "왕눈해",
    73: "독파리",
}
EVOLVES_TO = {1: 2, 2: 3, 4: 5, 5: 6, 7: 8, 8: 9, 10: 11, 11: 12, 13: 14, 14: 15,
              16: 17, 17: 18, 19: 20, 21: 22, 23: 24, 25: 26, 27: 28, 29: 30, 30: 31,
              32: 33, 33: 34, 35: 36, 37: 38, 39: 40, 41: 42, 43: 44, 44: 45, 46: 47,
              48: 49, 50: 51, 52: 53, 54: 55, 56: 57, 58: 59, 60: 61, 61: 62, 63: 64,
              64: 65, 66: 67, 67: 68, 69: 70, 70: 71, 72: 73}


def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    return struct.unpack(">II", head[16:24])


def credit_names(root):
    names = {}
    with open(os.path.join(root, "credit_names.txt"), encoding="utf-8") as f:
        next(f)
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) >= 2:
                names[cols[1]] = cols[0]
    return names


def main():
    root = sys.argv[1]
    lo = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    hi = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    who = credit_names(root)
    species, total = {}, 0
    prev = {v: k for k, v in EVOLVES_TO.items()}
    for n in range(lo, hi + 1):
        d = os.path.join(root, "sprite", f"{n:04d}")
        anims = {a.findtext("Name"): a for a in ET.parse(os.path.join(d, "AnimData.xml")).getroot().iter("Anim")}
        out = {}
        for name in ANIMS:
            a = anims.get(name)
            if a is None:
                continue
            src = a.findtext("CopyOf") or name  # 다른 동작 시트를 그대로 쓰는 경우
            a2 = anims.get(src, a)
            png = os.path.join(d, f"{src}-Anim.png")
            if not os.path.exists(png):
                continue
            fw, fh = int(a2.findtext("FrameWidth")), int(a2.findtext("FrameHeight"))
            w, h = png_size(png)
            data = open(png, "rb").read()
            total += len(data)
            out[name] = {
                "img": "data:image/png;base64," + base64.b64encode(data).decode(),
                "fw": fw, "fh": fh, "frames": w // fw, "rows": h // fh,
                "dur": [int(x.text) for x in a2.iter("Duration")],
            }
        # 진화 단계: 이 종이 계열에서 몇 번째인지(1~3)
        stage, k = 1, n
        while k in prev:
            stage, k = stage + 1, prev[k]
        authors = []
        cpath = os.path.join(d, "credits.txt")
        if os.path.exists(cpath):
            for line in open(cpath, encoding="utf-8"):
                cols = line.split("\t")
                if len(cols) > 1:
                    name = who.get(cols[1], cols[1])
                    if name not in authors:
                        authors.append(name)
        species[n] = {"name": KO.get(n, f"#{n}"), "stage": stage, "next": EVOLVES_TO.get(n) if EVOLVES_TO.get(n, 0) <= hi else None,
                      "anims": out, "credits": authors}
    js = ("/* 자동 생성 파일: tools/build_pokemon.py 로 만듦. 직접 고치지 마세요.\n"
          " * 스프라이트 출처: PMD Sprite Repository (SpriteCollab) https://sprites.pmdcollab.org/\n"
          " * 라이선스: CC BY-NC 4.0 https://creativecommons.org/licenses/by-nc/4.0/ */\n"
          "window.POKEMON_DATA = " + json.dumps({"species": species}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    dst = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pokemon-data.js")
    open(dst, "w", encoding="utf-8").write(js)
    print(f"{len(species)}종, 원본 PNG {total // 1024}KB -> {dst} ({len(js.encode()) // 1024}KB)")


if __name__ == "__main__":
    main()
