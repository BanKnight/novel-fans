const fs = require("fs")
const path = require("path")

const server = global.server

const blacks = ['index']

const file_or_folders = fs.readdirSync(__dirname)

file_or_folders.forEach(element => {
    let base_name = path.basename(element,".js")
    if(blacks.includes(base_name) == false)
    {
        let module_info = require(path.join(__dirname,base_name))

        server.new(base_name,module_info.data,module.priroty)
    }
});