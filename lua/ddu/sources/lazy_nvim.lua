local M = {}

--- Recursively access the metatables and retrieve the owner/repo
local function get_full_plugin_name(plugin)
  local mt = getmetatable(plugin)
  if mt and mt.__index then
    local index = mt.__index
    if type(index) == "table" then
      for _, value in pairs(index) do
        if type(value) == "string" and value:match(".+/.+") then
          return value
        end
      end
      return get_full_plugin_name(index)
    end
  end
  return nil
end

function M.plugins_action_data()
  local plugins = {}
  for _, plugin in pairs(require("lazy.core.config").plugins) do
    table.insert(plugins, { -- it forms ddu Item<FileActionData & {spec: string; lazy: boolean}>
      word = plugin[1],
      action = {
        name = plugin.name,
        path = plugin.dir,
        isDirectory = true,
        url = plugin.url,
        spec = get_full_plugin_name(plugin) or plugin[1],
        lazy = plugin.lazy,
      },
    })
  end
  return plugins
end

return M
