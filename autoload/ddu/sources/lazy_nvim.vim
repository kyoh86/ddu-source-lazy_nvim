function ddu#sources#lazy_nvim#plugins_action_data()
	return luaeval('require("ddu.sources.lazy_nvim").plugins_action_data()')
endfunction
function ddu#sources#lazy_nvim#devdir()
  return luaeval('require("lazy.core.config").options.dev.path')
endfunction
