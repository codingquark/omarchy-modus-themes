-- SPDX-License-Identifier: GPL-3.0-or-later
-- Modus Vivendi; loaded after Omarchy defaults.
hl.config({
  general = { col = { active_border = "rgb(00bcff)", inactive_border = "rgb(646464)" } },
  decoration = { active_opacity = 1.0, inactive_opacity = 1.0, dim_inactive = false },
  group = {
    col = { border_active = "rgb(00bcff)", border_inactive = "rgb(646464)" },
    groupbar = {
      text_color = "rgb(ffffff)", text_color_inactive = "rgb(bfbfbf)",
      col = { active = "rgb(2f447f)", inactive = "rgb(1e1e1e)" },
    },
  },
})
o.window({ tag = "default-opacity" }, { opacity = "1.0 override 1.0 override" })
