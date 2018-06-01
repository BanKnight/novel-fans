const path = require("path")

var env = process.env.NODE_ENV || 'production';
env = env.toLowerCase()

var file = path.resolve(__dirname, env)

global.config = module.exports = require(file)