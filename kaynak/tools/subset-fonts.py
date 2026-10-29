# Builds the self-hosted woff2 fonts in public/assets/fonts (Latin + Turkish subsets).
# Sources are the OFL variable fonts from github.com/google/fonts.
# Usage: python tools/subset-fonts.py <src_dir> public/assets/fonts
# Needs: pip install fonttools brotli
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + list(range(0x100, 0x180)) +
    list(range(0x2010, 0x2028)) + list(range(0x2030, 0x203B)) +
    [0x20AC, 0x20BA, 0x2122, 0x2212, 0x2713, 0x2715] + list(range(0x2190, 0x219A))
)

JOBS = [
    # (source, output, axis limits or static weight, unicodes)
    ('Outfit.ttf', 'outfit-v1.woff2', {'wght': (300, 700)}, UNICODES),
    ('PlusJakartaSans.ttf', 'plus-jakarta-sans-v1.woff2', {'wght': (400, 700)}, UNICODES),
    ('JetBrainsMono.ttf', 'jetbrains-mono-v1.woff2', {'wght': (500, 600)}, UNICODES),
    ('Montserrat.ttf', 'montserrat-logo-v1.woff2', {'wght': 700}, [ord(c) for c in 'MAXEFOR']),
]

for name, target, axes, unicodes in JOBS:
    # Subset glyphs first: limiting the axes first breaks gvar on some fonts
    font = TTFont(src / name)
    opts = subset.Options()
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(options=opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    font = instancer.instantiateVariableFont(font, axes)
    font.flavor = 'woff2'
    font.save(out / target)
    print(f'{target}: {(out / target).stat().st_size} bytes')
