"""Relative luminance: the foundation of readable color."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Surface:
    foreground: str
    background: str


def luminance(color: str) -> float:
    channels = [int(color[i:i + 2], 16) / 255
                for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045
              else ((v + 0.055) / 1.055) ** 2.4
              for v in channels]
    return sum(v * w for v, w in zip(
        linear, (0.2126, 0.7152, 0.0722)))


def contrast(surface: Surface) -> float:
    """Measure text against its actual background."""
    fg = luminance(surface.foreground)
    bg = luminance(surface.background)
    return (max(fg, bg) + 0.05) / (min(fg, bg) + 0.05)


canvas = Surface("#000000", "#ffffff")
assert contrast(canvas) >= 7.0
