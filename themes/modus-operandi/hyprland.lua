-- SPDX-License-Identifier: GPL-3.0-or-later
-- Modus Operandi; loaded after Omarchy defaults.
hl.config({
  general = { col = { active_border = "rgb(0031a9)", inactive_border = "rgb(9f9f9f)" } },
  decoration = { active_opacity = 1.0, inactive_opacity = 1.0, dim_inactive = false },
  group = {
    col = { border_active = "rgb(0031a9)", border_inactive = "rgb(9f9f9f)" },
    groupbar = {
      text_color = "rgb(000000)", text_color_inactive = "rgb(474747)",
      col = { active = "rgb(c0deff)", inactive = "rgb(f2f2f2)" },
    },
  },
})
o.window({ tag = "default-opacity" }, { opacity = "1.0 override 1.0 override" })
