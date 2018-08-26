const config = global.config
const server = global.server

const md_db = server.get("db")

const me = server.get("users")
const data = me.data

me.start = async function ()
{
    let db_data = await md_db.load("users")

    for (let i = 0, len = db_data.length; i < len; ++i)
    {
        let db_one = db_data[i]
        let user = {
            id: db_one._id,
            mail: db_one.mail,
            pass: db_one.pass,
            regist: db_one.regist,
            reading: db_one.reading || {},
            token: db_one.token,
            is_temp: db_one.is_temp || false,
        }

        data.pid_users[user.id] = user
        if (user.is_temp === false)
        {
            data.mail_users[user.mail] = user
        }

        data.id_helper = Math.max(data.id_helper, user.id)
    }

    return true
}

me.get = function (id)
{
    return data.pid_users[id]
}

me.set = function (id, val)
{
    data.pid_users[id] = val
}

me.destroy = function (id)
{
    delete data.pid_users[id]
}

me.get_by_mail = function (mail)
{
    return data.mail_users[mail]
}

me.new = async function (mail, pass)
{
    let user = {
        id: ++data.id_helper,
        mail: mail,
        pass: pass,
        regist: Date.now(),
        reading: {},
    }

    data.pid_users[user.id] = user
    data.mail_users[user.mail] = user

    await md_db.upsert("users", { _id: user.id }, {
        mail: mail,
        pass: pass,
        regist: user.regist,
        reading: {},
    })

    return user
}

me.new_temp_user = async function ()
{
    let user = {
        id: ++data.id_helper,
        mail: "",
        pass: "",
        regist: Date.now(),
        reading: {},
        is_temp: true,
    }

    data.pid_users[user.id] = user
    // data.mail_users[user.mail] = user

    await md_db.upsert("users", { _id: user.id }, {
        mail: user.mail,
        pass: user.pass,
        regist: user.regist,
        is_temp: true,
        reading: {},
    })

    return user
}

me.temp_to_regular = async function (user)
{
    user.is_temp = false

    data.mail_users[user.mail] = user

    await md_db.upsert("users", { _id: user.id }, {
        mail: user.mail,
        pass: user.pass,
        is_temp: false,
        reading: user.reading,
    })
}

me.update_book = async function (user)
{
    await md_db.upsert("users", { _id: user.id }, {
        reading: user.reading,
    })
}
me.update = async function (user)
{
    await md_db.upsert("users", { _id: user.id }, {
        mail: user.mail,
        pass: user.pass,
        token: user.token,
        is_temp: false,
    })
}